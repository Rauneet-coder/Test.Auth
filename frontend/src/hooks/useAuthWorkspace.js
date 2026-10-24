import { useCallback, useEffect, useRef, useState } from "react";
import { authApi, describeRequestError } from "../services/api.js";
import {
  appendActivity, createActivityEntry, getAction, modeFromPath, pathFromMode, payloadForAction,
} from "../lib/workspace.js";

export default function useAuthWorkspace() {
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const requestController = useRef(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestController.current?.abort();
    };
  }, []);
  const [mode, setMode] = useState(() => modeFromPath(globalThis.location?.pathname));
  const [fields, setFields] = useState({ username: "", email: "", password: "", otp: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState("");
  const [history, setHistory] = useState([]);
  const [result, setResult] = useState(null);
  const [user] = useState(null);
  const [sessionStatus] = useState("signed-out");
  const [online] = useState(() => globalThis.navigator?.onLine !== false);
  const [expiresAt] = useState(null);

  const changeMode = useCallback((next) => {
    const safeMode = ["login", "register", "verify"].includes(next) ? next : "login";
    const path = pathFromMode(safeMode);
    if (globalThis.location && globalThis.location.pathname !== path) {
      globalThis.history?.pushState(null, "", path);
    }
    setMode(safeMode);
    setFieldErrors({});
    setNotice(null);
  }, []);
  useEffect(() => {
    const onPopState = () => {
      setMode(modeFromPath(globalThis.location?.pathname));
      setFieldErrors({});
      setNotice(null);
    };
    const path = pathFromMode(modeFromPath(globalThis.location?.pathname));
    if (globalThis.location && globalThis.location.pathname !== path) {
      globalThis.history?.replaceState(null, "", path);
    }
    globalThis.addEventListener?.("popstate", onPopState);
    return () => globalThis.removeEventListener?.("popstate", onPopState);
  }, []);
  const updateField = useCallback((name, value) => {
    if (!["username", "email", "password", "otp"].includes(name)) return;
    setFields((previous) => ({ ...previous, [name]: value }));
  }, []);
  const record = useCallback((entry) => {
    setResult(entry);
    setHistory((previous) => appendActivity(previous, entry));
  }, []);

  const run = useCallback(async (action, payload) => {
    if (inFlight.current) return null;
    getAction(action);
    inFlight.current = true;
    const controller = new AbortController();
    requestController.current = controller;
    setBusy(action);
    setNotice(null);
    setFieldErrors({});
    const start = performance.now();
    try {
      const response = await authApi[action](payloadForAction(action, payload), { signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return null;
      record(createActivityEntry(action, response.status, performance.now() - start, response.data));
      setNotice({ type: "success", message: response.data.message });
      return response;
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return null;
      const details = describeRequestError(error, { online: globalThis.navigator?.onLine !== false });
      record(createActivityEntry(action, details.status, performance.now() - start,
        error.response?.data || { message: details.message }));
      setNotice({ type: "error", message: details.message });
      return null;
    } finally {
      inFlight.current = false;
      if (requestController.current === controller) requestController.current = null;
      if (mounted.current) setBusy("");
    }
  }, [record]);

  const submit = useCallback((event) => {
    event?.preventDefault();
    return run(mode === "verify" ? "verifyEmail" : mode, fields);
  }, [fields, mode, run]);

  return {
    mode, changeMode, fields, updateField, fieldErrors, notice,
    dismissNotice: () => setNotice(null), busy, user, sessionStatus,
    history, result, setResult, run, submit,
    clearHistory: () => setHistory([]), clearResult: () => setResult(null),
    online, expiresAt,
  };
}
