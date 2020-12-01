import { Utils, Collections } from '../vulcan-lib';
import { getMultiResolverName, findWatchesByTypeName, getUpdateMutationName, getCreateMutationName, getDeleteMutationName } from './utils';

export const updateCacheAfterCreate = (typeName: string) => {
  const mutationName = getCreateMutationName(typeName);
  return (store, mutationResult) => {
    const { data: { [mutationName]: {data: document} } } = mutationResult
    updateEachQueryResultOfType({ func: handleCreateMutation, store, typeName,  document })
  }
}

export const updateCacheAfterUpdate = (typeName: string) => {
  const mutationName = getUpdateMutationName(typeName);
  return (store, mutationResult) => {
    const { data: { [mutationName]: {data: document} } } = mutationResult
    updateEachQueryResultOfType({ func: handleUpdateMutation, store, typeName,  document })
  }
}

export const updateCacheAfterDelete = (typeName: string) => {
  const mutationName = getDeleteMutationName(typeName);
  return (store, { data: { [mutationName]: {data: document} } }: any) => {
    updateEachQueryResultOfType({ func: handleDeleteMutation, store, typeName, document })
  }
}

export const updateEachQueryResultOfType = ({ store, typeName, func, document }) => {
  const watchesToUpdate = findWatchesByTypeName(Array.from(store.watches), typeName)
  watchesToUpdate.forEach(({query, variables }) => {
    const { input: { terms } } = variables
    const data = store.readQuery({query, variables})
    const multiResolverName = getMultiResolverName(typeName);
    const parameters = getParametersByTypeName(terms, typeName);
    const results = data[multiResolverName]

    const updatedResults = func({document, results, parameters, typeName})
    const newData = {
      ...data,
      [multiResolverName]: updatedResults
    }
    store.writeQuery({query, data: newData, variables})
  })
}

const getParametersByTypeName = (terms, typeName) => {
  const collection = Collections.find(c => c.typeName === typeName);
  return collection.getParameters(terms /* apolloClient */);
}

export const handleDeleteMutation = ({ document, results, typeName }) => {
  if (!document) return results;
  results = Utils.mingoRemoveFromSet(results, document);

  return {
    ...results,
    __typename: `Multi${typeName}Output`
  };
}

export const handleCreateMutation = ({ document, results, parameters: { selector, options }, typeName }) => {
  if (!document) return results;

  if (Utils.mingoBelongsToSet(document, selector)) {
    if (!Utils.mingoIsInSet(results, document)) {
      // make sure document hasn't been already added as this may be called several times
      results = Utils.mingoAddToSet(results, document);
    }
    results = Utils.mingoReorderSet(results, options.sort, selector);
  }

  return {
    ...results,
    __typename: `Multi${typeName}Output`
  };
}

// Theoretically works for upserts
export const handleUpdateMutation = ({ document, results, parameters: { selector, options }, typeName }) => {
  if (!document) return results;
  if (Utils.mingoBelongsToSet(document, selector)) {
    // edited document belongs to the list
    if (!Utils.mingoIsInSet(results, document)) {
      // if document wasn't already in list, add it
      results = Utils.mingoAddToSet(results, document);
    } else {
      // if document was already in the list, update it
      results = Utils.mingoUpdateInSet(results, document);
    }
    results = Utils.mingoReorderSet(results, options.sort, selector);
  } else {
    // if edited doesn't belong to current list anymore (based on view selector), remove it
    results = Utils.mingoRemoveFromSet(results, document);
  }
  return {
    ...results,
    __typename: `Multi${typeName}Output`
  }
}
