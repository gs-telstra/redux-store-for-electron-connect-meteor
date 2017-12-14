import { REGISTER_REACTIVE_SOURCE } from './actions';
import { actionCase, hasGet, hasSubscribe, hasKey, errorWith } from './utils';

const computations = {};

export default Meteor => ({ dispatch }) => next => action => {
  const throwIfNot = errorWith(action);

  if (action.type === REGISTER_REACTIVE_SOURCE) {
    const register = () => {
      throwIfNot(hasKey,
        'A registerReactiveSource action needs a `key` string to identify tracked source'
      );

      throwIfNot(hasGet,
        'A registerReactiveSource action needs a `get` function to load data'
      );

      throwIfNot(x => !hasSubscribe(x),
        'Use a startSubscription action to start a subscription'
      );

      const { key } = action.payload;
      const { Tracker: tracker } = Meteor;
      const Data = Meteor.getData();
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
      if (computations[key]) {
        computations[key].stop();
      }

      computations[key] = tracker.autorun(() => {
        _meteorDataDep.depend();        
        dispatch({
          type: `${actionCase(key)}_REACTIVE_SOURCE_CHANGED`,
          payload: action.payload.get(),
        });
      });
    };

    setTimeout(register);
  }

  return next(action);
};
