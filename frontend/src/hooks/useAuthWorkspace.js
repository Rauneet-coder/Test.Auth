import { useCallback, useEffect, useRef, useState } from "react";
import { authApi, describeRequestError, setAccessToken } from "../services/api.js";
import {
  appendActivity, createActivityEntry, fieldErrorsFromResponse, formAfterSuccess, getAction, modeFromPath, pathFromMode, payloadForAction, profileFromResponse, redactData, tokenExpiresAt, verificationRecovery,
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
  const [result, setResultState] = useState(null);
  const setResult = useCallback((next) => {
    setResultState((previous) => redactData(typeof next === "function" ? next(previous) : next));
  }, []);
  const dismissNotice = useCallback(() => setNotice(null), []);
  const clearHistory = useCallback(() => setHistory([]), []);
  const clearResult = useCallback(() => setResultState(null), []);
  const [user, setUser] = useState(null);
  const [sessionStatus, setSessionStatus] = useState("signed-out");
  const [online, setOnline] = useState(() => globalThis.navigator?.onLine !== false);
  const [expiresAt, setExpiresAt] = useState(null);
  useEffect(() => {
    const updateConnection = () => setOnline(globalThis.navigator?.onLine !== false);
    globalThis.addEventListener?.("online", updateConnection);
    globalThis.addEventListener?.("offline", updateConnection);
    updateConnection();
    return () => {
      globalThis.removeEventListener?.("online", updateConnection);
      globalThis.removeEventListener?.("offline", updateConnection);
    };
  }, []);

  const changeMode = useCallback((next) => {
    const safeMode = ["login", "register", "verify"].includes(next) ? next : "login";
    const path = pathFromMode(safeMode);
    if (globalThis.location && globalThis.location.pathname !== path) {
      globalThis.history?.pushState(null, "", `${path}${globalThis.location.search || ""}${globalThis.location.hash || ""}`);
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
      globalThis.history?.replaceState(null, "", `${path}${globalThis.location.search || ""}${globalThis.location.hash || ""}`);
    }
    globalThis.addEventListener?.("popstate", onPopState);
    return () => globalThis.removeEventListener?.("popstate", onPopState);
  }, []);
  const updateField = useCallback((name, value) => {
    if (!["username", "email", "password", "otp"].includes(name)) return;
    setFields((previous) => ({ ...previous, [name]: value }));
    setFieldErrors((previous) => {
      const next = { ...previous };
      delete next[name];
      return next;
    });
  }, []);
  const record = useCallback((entry) => {
    setResultState(entry);
    setHistory((previous) => appendActivity(previous, entry));
  }, []);

  const run = useCallback(async (action, payload) => {
    if (inFlight.current) return null;
    getAction(action);
    if (globalThis.navigator?.onLine === false) {
      setNotice({ type: "error", message: "You are offline. Reconnect, then try your request again." });
      return null;
    }
    inFlight.current = true;
    const controller = new AbortController();
    requestController.current = controller;
    setBusy(action);
    setNotice(null);
    setFieldErrors({});
    let start = performance.now();
    let requestAction = action;
    const requestPayload = payloadForAction(action, payload);
    const secrets = [requestPayload?.password, requestPayload?.otp];
    try {
      const response = await authApi[action](requestPayload, { signal: controller.signal });
      if (!mounted.current || controller.signal.aborted) return null;
      record(createActivityEntry(action, response.status, performance.now() - start, redactData(response.data, secrets)));
      if (action === "refreshToken") {
        setAccessToken(response.data.accessToken);
        setExpiresAt(tokenExpiresAt(response.data.accessToken));
        setUser(null);
        setSessionStatus("restoring");
        requestAction = "getMe";
        start = performance.now();
        const profile = await authApi.getMe(undefined, { signal: controller.signal });
        if (!mounted.current || controller.signal.aborted) return null;
        record(createActivityEntry("getMe", profile.status, performance.now() - start, profile.data));
        setUser(profileFromResponse(profile.data));
        setSessionStatus("signed-in");
      }
      if (action === "login" || action === "getMe") {
        if (action === "login") {
          setAccessToken(response.data.accessToken);
          setExpiresAt(tokenExpiresAt(response.data.accessToken));
          setFields((previous) => formAfterSuccess(action, previous, response.data));
        }
        setUser(profileFromResponse(response.data));
        setSessionStatus("signed-in");
      }
      if (action === "logout" || action === "logoutAll") {
        setAccessToken(null);
        setExpiresAt(null);
        setUser(null);
        setSessionStatus("signed-out");
        setFields((previous) => ({ ...previous, password: "", otp: "" }));
      }
      if (action === "register") {
        setFields((previous) => formAfterSuccess(action, previous, response.data));
        setSessionStatus((previous) => previous === "signed-in" ? previous : "verification-pending");
        changeMode("verify");
      }
      if (action === "verifyEmail") {
        setFields((previous) => formAfterSuccess(action, previous, response.data));
        setSessionStatus((previous) => previous === "signed-in" ? previous : "signed-out");
        changeMode("login");
      }
      setNotice({ type: "success", message: action === "register"
        ? "Account created. Check your email for the verification code."
        : action === "verifyEmail" ? "Email verified. You can sign in now." : redactData(response.data.message, secrets) });
      return response;
    } catch (error) {
      if (!mounted.current || controller.signal.aborted) return null;
      setFieldErrors(redactData(fieldErrorsFromResponse(error.response?.data), secrets));
      const details = describeRequestError(error, { online: globalThis.navigator?.onLine !== false });
      record(createActivityEntry(requestAction, details.status, performance.now() - start,
        redactData(error.response?.data || { message: details.message }, secrets)));
      if (error.response?.status === 401) {
        setAccessToken(null);
        setExpiresAt(null);
        setUser(null);
        setSessionStatus("expired");
      } else if (action === "refreshToken" && requestAction === "getMe") {
        setSessionStatus("signed-out");
      }
      const recovery = verificationRecovery(action, error, requestPayload);
      if (recovery) {
        setFields((previous) => ({ ...previous, ...recovery }));
        setSessionStatus((previous) => previous === "signed-in" ? previous : "verification-pending");
        changeMode("verify");
      }
      setNotice({ type: "error", message: recovery
        ? "Your email needs verification. Enter the verification code from your inbox."
        : redactData(details.message, secrets) });
      return null;
    } finally {
      inFlight.current = false;
      if (requestController.current === controller) requestController.current = null;
      if (mounted.current) setBusy("");
    }
  }, [changeMode, record]);

  const submit = useCallback((event) => {
    event?.preventDefault();
    return run(mode === "verify" ? "verifyEmail" : mode, fields);
  }, [fields, mode, run]);

  return {
    mode, changeMode, fields, updateField, fieldErrors, notice,
    dismissNotice, busy, user, sessionStatus,
    history, result, setResult, run, submit,
    clearHistory, clearResult,
    online, expiresAt,
  };
}
