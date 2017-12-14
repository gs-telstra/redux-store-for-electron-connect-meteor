import subscriptionsMiddleware from './subscriptions';
import sourcesMiddleware from './sources';
import { injectMeteor } from './utils';

const middlewares = [
  subscriptionsMiddleware,
  sourcesMiddleware,
];

export * from './actions';

export default (Meteor) => {
  const [subscriptions, sources] = injectMeteor(Meteor, middlewares);

  return {
    subscriptions,
    sources,
  };
};
