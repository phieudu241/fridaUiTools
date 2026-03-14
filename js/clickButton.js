Java.perform(function () {
    var View = Java.use("android.view.View");
    var OnClickListenerClass = Java.use("android.view.View$OnClickListener");

    // Hook setOnClickListener to intercept when a click listener is set on any View
    View.setOnClickListener.implementation = function (listener) {
        if (listener != null) {
            var originalListener = listener; // keep raw reference

            // Wrap the original listener with our proxy
            var listenerProxy = Java.implement(OnClickListenerClass, {
                onClick: function (view) {
                    var viewId = view.getId();
                    var viewClass = view.getClass().getName();

                    // Try to get the resource entry name for the view ID
                    try {
                        var context = view.getContext();
                        var resourceName = context.getResources().getResourceEntryName(viewId);
                        console.log("[+] Button clicked!");
                        console.log("    View class : " + viewClass);
                        console.log("    View ID    : " + viewId);
                        console.log("    Resource   : " + resourceName);
                    } catch (e) {
                        console.log("[+] Button clicked!");
                        console.log("    View class : " + viewClass);
                        console.log("    View ID    : " + viewId);
                    }

                    // Print a stack trace to know where the click originates
                    console.log("    Stack trace:\n" + Java.use("android.util.Log")
                        .getStackTraceString(Java.use("java.lang.Exception").$new()));

                    // Call original onClick via reflection
                    try {
                        var listenerClass = Java.use("java.lang.Class");
                        var onClickMethod = originalListener.getClass().getMethod(
                            "onClick",
                            [View.class]
                        );
                        onClickMethod.invoke(originalListener, [view]);
                    } catch (e) {
                        console.log("[-] Failed to call original onClick: " + e);
                    }
                }
            });

            this.setOnClickListener(listenerProxy);
        } else {
            this.setOnClickListener(listener);
        }
    };

    console.log("[*] Hooked View.setOnClickListener - waiting for button clicks...");
});
