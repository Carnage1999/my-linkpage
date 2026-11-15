;(function () {
  try {
    var savedTheme = localStorage.getItem('theme')
    if (savedTheme === 'dark') document.documentElement.classList.add('dark')
    else if (savedTheme === 'light') document.documentElement.classList.remove('dark')
    else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark')
    }
    var savedLang = localStorage.getItem('i18nextLng')
    if (savedLang) document.documentElement.lang = savedLang
  } catch (err) {
    console.warn('Init error:', err)
  }
})()
