export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          // eslint-disable-next-line no-console
          console.log('SW registered: ', registration)

          // Check for updates periodically
          setInterval(() => {
            registration.update()
          }, 60000) // Check every minute
        })
        .catch((registrationError) => {
          // eslint-disable-next-line no-console
          console.log('SW registration failed: ', registrationError)
        })
    })
  }
}
