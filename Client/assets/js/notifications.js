(function() {
    const PUSHER_KEY = "e3ac92c762aaed1a23ae";
    const PUSHER_CLUSTER = "mt1";
    
    let pusher = null;
    let notificationChannel = null;

    const createToastContainer = () => {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
        return container;
    };

    const showToast = (title, message, icon = 'ri-notification-3-line') => {
        const container = createToastContainer();
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${title || 'Notification'}</div>
                <div class="toast-message">${message || ''}</div>
            </div>
            <button class="toast-close">
                <i class="ri-close-line"></i>
            </button>
        `;

        container.appendChild(toast);

        const closeBtn = toast.querySelector('.toast-close');
        const removeToast = () => {
            if (toast.parentNode) {
                toast.classList.add('removing');
                setTimeout(() => toast.remove(), 300);
            }
        };

        closeBtn.onclick = removeToast;

        setTimeout(removeToast, 6000);
    };

    const initPusher = () => {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;

        try {
            const user = JSON.parse(userStr);
            const userId = user._id || user.id;
            if (!userId) return;

            if (typeof Pusher === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://js.pusher.com/8.4.0/pusher.min.js';
                script.onload = () => setupConnection(userId);
                document.head.appendChild(script);
            } else {
                setupConnection(userId);
            }
        } catch (e) {
            console.error("Error initializing notifications:", e);
        }
    };

    const setupConnection = (userId) => {
        if (pusher) return;

        try {
            pusher = new Pusher(PUSHER_KEY, {
                cluster: PUSHER_CLUSTER,
                forceTLS: true
            });

            const channelName = `user_${userId}`;
            notificationChannel = pusher.subscribe(channelName);

            notificationChannel.bind('notification', (data) => {
                console.log("New Notification:", data);
                
                let icon = 'ri-notification-3-line';
                if (data.type === 'chat_message') icon = 'ri-chat-3-line';
                else if (data.type === 'request_accepted') icon = 'ri-checkbox-circle-line';
                else if (data.type === 'request_rejected') icon = 'ri-close-circle-line';
                else if (data.type === 'session_started') icon = 'ri-rocket-line';
                else if (data.type === 'session_reminder') icon = 'ri-time-line';
                else if (data.type === 'rating_request') icon = 'ri-star-line';

                showToast(data.title, data.body || data.message, icon);

                window.dispatchEvent(new CustomEvent('pusher:notification', { detail: data }));
            });

            console.log(`Notifications active for user: ${userId}`);
        } catch (error) {
            console.error("Pusher connection error:", error);
        }
    };

    if (document.readyState === 'complete') {
        initPusher();
    } else {
        window.addEventListener('load', initPusher);
    }

    window.showToast = showToast;
    window.refreshNotificationConnection = initPusher;
})();
