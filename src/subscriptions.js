import {
  STOP_SUBSCRIPTION,
  START_SUBSCRIPTION,
} from './actions';

import {
  actionCase,
  errorWith,
  hasGet,
  hasKey,
  hasSubscribe,
  stringPayload,
} from './utils';

const subscriptions = {};
const computations = {};

const stopSubscription = action => {
  if (subscriptions[action.payload]) {
    const subscriptionId = subscriptions[action.payload].subscriptionId;

    computations[subscriptionId].stop();
    subscriptions[action.payload].stop();

    computations[subscriptionId] = undefined;
    subscriptions[action.payload] = undefined;
  }
};

export default Meteor => ({ dispatch }) => next => action => {
  const throwIfNot = errorWith(action);

  if (action.type === STOP_SUBSCRIPTION) {
    const stop = () => {
      throwIfNot(stringPayload,
        'A stopSubscription action needs a string payload to identify a subscription'
      );

      stopSubscription(action);
    };

    setTimeout(stop);
  } else if (action.type === START_SUBSCRIPTION) {
    const start = () => {
      throwIfNot(hasSubscribe,
        'A startSubscription action needs a `subscribe` function to start a subscription'
      );

      throwIfNot(hasKey,
        'A startSubscription action needs a `key` string to identify a subscription'
      );

      throwIfNot(hasGet,
        'A startSubscription action needs a `get` function to load data'
      );

      stopSubscription(action);
      const { Tracker: tracker } = Meteor;
      const Data = Meteor.getData();
      const { key, subscribe } = action.payload;
      const subscription = subscribe();
      const { subscriptionId } = subscription;
      const _meteorDataDep = new tracker.Dependency();
      const _meteorDataChangedCallback = (msg)=>{
        if (typeof msg === 'object' && key) {
          const dbChanged = Object.keys(msg);
          const findId = dbChanged.findIndex(item => item === key);
          if (findId !== -1 ){
            _meteorDataDep.changed();        
          }
        } else {
          _meteorDataDep.changed();          
        }
      }
      Data.onChange(_meteorDataChangedCallback);      
      subscriptions[key] = subscription;
      computations[subscriptionId] = tracker.autorun(() => {
        _meteorDataDep.depend();   
        const ready = subscription.ready();

        if (ready) {
          dispatch({
            type: `${actionCase(key)}_SUBSCRIPTION_CHANGED`,
            payload: action.payload.get(),
          });
        }

        dispatch({
          type: `${actionCase(key)}_SUBSCRIPTION_READY`,
          payload: {
            ready,
            data: action.payload.onReadyData
              ? action.payload.onReadyData()
              : {},
          },
        });
      });
    };

    setTimeout(start);
  }

  return next(action);
};
