import {
  AppFloatingConfigurator,
  Login
} from "./chunk-GHKYN5VB.js";
import "./chunk-5GKV6ARD.js";
import "./chunk-S5RQFQJR.js";
import {
  Button,
  ButtonModule,
  RippleModule,
  RouterLink,
  RouterModule
} from "./chunk-L5Q7NDTD.js";
import {
  Component,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵtext
} from "./chunk-JLR2E2AY.js";

// src/app/pages/auth/access.ts
var Access = class _Access {
  static \u0275fac = function Access_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Access)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Access, selectors: [["app-access"]], decls: 15, vars: 0, consts: [[1, "bg-surface-50", "dark:bg-surface-950", "flex", "items-center", "justify-center", "min-h-screen", "min-w-screen", "overflow-hidden"], [1, "flex", "flex-col", "items-center", "justify-center"], [2, "border-radius", "56px", "padding", "0.3rem", "background", "linear-gradient(180deg, rgba(247, 149, 48, 0.4) 10%, rgba(247, 149, 48, 0) 30%)"], [1, "w-full", "bg-surface-0", "dark:bg-surface-900", "py-20", "px-8", "sm:px-20", "flex", "flex-col", "items-center", 2, "border-radius", "53px"], [1, "gap-4", "flex", "flex-col", "items-center"], [1, "flex", "justify-center", "items-center", "border-2", "border-orange-500", "rounded-full", 2, "width", "3.2rem", "height", "3.2rem"], [1, "text-orange-500", "pi", "pi-fw", "pi-lock", "text-2xl!"], [1, "text-surface-900", "dark:text-surface-0", "font-bold", "text-4xl", "lg:text-5xl", "mb-2"], [1, "text-muted-color", "mb-8"], ["src", "https://primefaces.org/cdn/templates/sakai/auth/asset-access.svg", "alt", "Access denied", "width", "80%", 1, "mb-8"], [1, "col-span-12", "mt-8", "text-center"], ["label", "Go to Dashboard", "routerLink", "/", "severity", "warn"]], template: function Access_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275element(0, "app-floating-configurator");
      \u0275\u0275elementStart(1, "div", 0)(2, "div", 1)(3, "div", 2)(4, "div", 3)(5, "div", 4)(6, "div", 5);
      \u0275\u0275element(7, "i", 6);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "h1", 7);
      \u0275\u0275text(9, "Access Denied");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(10, "span", 8);
      \u0275\u0275text(11, "You do not have the necessary permisions. Please contact admins.");
      \u0275\u0275elementEnd();
      \u0275\u0275element(12, "img", 9);
      \u0275\u0275elementStart(13, "div", 10);
      \u0275\u0275element(14, "p-button", 11);
      \u0275\u0275elementEnd()()()()()();
    }
  }, dependencies: [ButtonModule, Button, RouterModule, RouterLink, RippleModule, AppFloatingConfigurator], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Access, [{
    type: Component,
    args: [{
      selector: "app-access",
      standalone: true,
      imports: [ButtonModule, RouterModule, RippleModule, AppFloatingConfigurator, ButtonModule],
      template: ` <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, rgba(247, 149, 48, 0.4) 10%, rgba(247, 149, 48, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 flex flex-col items-center" style="border-radius: 53px">
                        <div class="gap-4 flex flex-col items-center">
                            <div class="flex justify-center items-center border-2 border-orange-500 rounded-full" style="width: 3.2rem; height: 3.2rem">
                                <i class="text-orange-500 pi pi-fw pi-lock text-2xl!"></i>
                            </div>
                            <h1 class="text-surface-900 dark:text-surface-0 font-bold text-4xl lg:text-5xl mb-2">Access Denied</h1>
                            <span class="text-muted-color mb-8">You do not have the necessary permisions. Please contact admins.</span>
                            <img src="https://primefaces.org/cdn/templates/sakai/auth/asset-access.svg" alt="Access denied" class="mb-8" width="80%" />
                            <div class="col-span-12 mt-8 text-center">
                                <p-button label="Go to Dashboard" routerLink="/" severity="warn" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Access, { className: "Access" });
})();

// src/app/pages/auth/error.ts
var Error = class _Error {
  static \u0275fac = function Error_Factory(__ngFactoryType__) {
    return new (__ngFactoryType__ || _Error)();
  };
  static \u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _Error, selectors: [["app-error"]], decls: 15, vars: 0, consts: [[1, "bg-surface-50", "dark:bg-surface-950", "flex", "items-center", "justify-center", "min-h-screen", "min-w-screen", "overflow-hidden"], [1, "flex", "flex-col", "items-center", "justify-center"], [2, "border-radius", "56px", "padding", "0.3rem", "background", "linear-gradient(180deg, rgba(233, 30, 99, 0.4) 10%, rgba(33, 150, 243, 0) 30%)"], [1, "w-full", "bg-surface-0", "dark:bg-surface-900", "py-20", "px-8", "sm:px-20", "flex", "flex-col", "items-center", 2, "border-radius", "53px"], [1, "gap-4", "flex", "flex-col", "items-center"], [1, "flex", "justify-center", "items-center", "border-2", "border-pink-500", "rounded-full", 2, "height", "3.2rem", "width", "3.2rem"], [1, "pi", "pi-fw", "pi-exclamation-circle", "text-2xl!", "text-pink-500"], [1, "text-surface-900", "dark:text-surface-0", "font-bold", "text-5xl", "mb-2"], [1, "text-muted-color", "mb-8"], ["src", "https://primefaces.org/cdn/templates/sakai/auth/asset-error.svg", "alt", "Error", "width", "80%", 1, "mb-8"], [1, "col-span-12", "mt-8", "text-center"], ["label", "Go to Dashboard", "routerLink", "/", "severity", "danger"]], template: function Error_Template(rf, ctx) {
    if (rf & 1) {
      \u0275\u0275element(0, "app-floating-configurator");
      \u0275\u0275elementStart(1, "div", 0)(2, "div", 1)(3, "div", 2)(4, "div", 3)(5, "div", 4)(6, "div", 5);
      \u0275\u0275element(7, "i", 6);
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(8, "h1", 7);
      \u0275\u0275text(9, "Error Occured");
      \u0275\u0275elementEnd();
      \u0275\u0275elementStart(10, "span", 8);
      \u0275\u0275text(11, "Requested resource is not available.");
      \u0275\u0275elementEnd();
      \u0275\u0275element(12, "img", 9);
      \u0275\u0275elementStart(13, "div", 10);
      \u0275\u0275element(14, "p-button", 11);
      \u0275\u0275elementEnd()()()()()();
    }
  }, dependencies: [ButtonModule, Button, RippleModule, RouterModule, RouterLink, AppFloatingConfigurator], encapsulation: 2 });
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(Error, [{
    type: Component,
    args: [{
      selector: "app-error",
      imports: [ButtonModule, RippleModule, RouterModule, AppFloatingConfigurator, ButtonModule],
      standalone: true,
      template: ` <app-floating-configurator />
        <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-screen overflow-hidden">
            <div class="flex flex-col items-center justify-center">
                <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, rgba(233, 30, 99, 0.4) 10%, rgba(33, 150, 243, 0) 30%)">
                    <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20 flex flex-col items-center" style="border-radius: 53px">
                        <div class="gap-4 flex flex-col items-center">
                            <div class="flex justify-center items-center border-2 border-pink-500 rounded-full" style="height: 3.2rem; width: 3.2rem">
                                <i class="pi pi-fw pi-exclamation-circle text-2xl! text-pink-500"></i>
                            </div>
                            <h1 class="text-surface-900 dark:text-surface-0 font-bold text-5xl mb-2">Error Occured</h1>
                            <span class="text-muted-color mb-8">Requested resource is not available.</span>
                            <img src="https://primefaces.org/cdn/templates/sakai/auth/asset-error.svg" alt="Error" class="mb-8" width="80%" />
                            <div class="col-span-12 mt-8 text-center">
                                <p-button label="Go to Dashboard" routerLink="/" severity="danger" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(Error, { className: "Error" });
})();

// src/app/pages/auth/auth.routes.ts
var auth_routes_default = [
  { path: "access", component: Access },
  { path: "error", component: Error },
  { path: "login", component: Login }
];
export {
  auth_routes_default as default
};
//# sourceMappingURL=chunk-LL47JMEF.js.map
