import firebase from "firebase/app";
import { useEffect, useReducer } from "react";
import useMemoCompare from "./useMemoCompare";

interface Action {
  type: string;
  payload?: any;
}

interface State<T> {
  status: string;
  data?: T | undefined;
  error?: any;
}

function reducer<T>(state: State<T>, action: Action) {
  switch (action.type) {
    case "idle":
      return { status: "idle", data: undefined, error: undefined };
    case "loading":
      return { status: "loading", data: undefined, error: undefined };
    case "success":
      return { status: "success", data: action.payload, error: undefined };
    case "error":
      return { status: "error", data: undefined, error: action.payload };
    default:
      throw new Error("invalid action");
  }
}

export default function useFirestoreQuery<T>(
  query: firebase.firestore.Query | undefined,
  lazy: boolean = false
): State<T> {
  const initialState = {
    status: query ? "loading" : "idle",
    data: undefined,
    error: undefined,
  };

  const [state, dispatch] = useReducer(reducer, initialState);

  const queryCached = useMemoCompare(query, (prevQuery) => {
    if (prevQuery && query) {
      return query.isEqual(prevQuery);
    }
    return false;
  });

  useEffect(() => {
    if (!queryCached || lazy) {
      dispatch({ type: "idle" });
      return () => {};
    }

    dispatch({ type: "loading" });

    return queryCached.onSnapshot(
      (response: any) => {
        dispatch({ type: "success", payload: getQueryData(response) });
      },
      (error: any) => {
        dispatch({ type: "error", payload: error });
      }
    );
  }, [queryCached, lazy]);

  return state;
}

function getDocData(doc: firebase.firestore.DocumentSnapshot) {
  return doc.exists === true ? { id: doc.id, ...doc.data() } : null;
}

function getQueryData(collection: any) {
  return collection.docs.map(getDocData);
}
