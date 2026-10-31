import { afterAOP } from "../AOP";
import { triggerPopstateEvent } from "../events";

export const hkHistory = () => {
  const triggerPopStateEvent = (_state?: PopStateEvent["state"]) => {
    // console.log("triggerPopStateEvent");
    // const popStateEvent = new PopStateEvent("popstate", { state });
    // window.dispatchEvent(popStateEvent);
    const customEvent = new CustomEvent(hkHistory.name, {
      bubbles: true,
      cancelable: true,
    });
    // console.log(hkHistory.name)
    window.dispatchEvent(customEvent);
  };

  const triggerPopstateAOP = afterAOP(triggerPopStateEvent);

  window.History.prototype.pushState = triggerPopstateAOP(
    window.History.prototype.pushState.bind(history),
  );
  window.History.prototype.replaceState = triggerPopstateAOP(
    window.History.prototype.replaceState.bind(history),
  );
};

export const navigateTo = (url: string) => {
  history.pushState(null, "", url);
  triggerPopstateEvent(window);
};
