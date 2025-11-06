// src/App.jsx
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const socials = [
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com/Carnage1999',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 .5C5.73.5.84 5.39.84 11.66c0 4.83 3.13 8.92 7.47 10.37.55.1.75-.24.75-.53 0-.26-.01-1.12-.02-2.02-3.04.66-3.68-1.47-3.68-1.47-.5-1.28-1.23-1.62-1.23-1.62-.99-.68.07-.67.07-.67 1.1.08 1.68 1.13 1.68 1.13.97 1.66 2.54 1.18 3.16.9.1-.7.38-1.18.69-1.45-2.43-.28-4.99-1.21-4.99-5.39 0-1.19.42-2.16 1.11-2.92-.11-.28-.48-1.4.11-2.92 0 0 .9-.29 2.95 1.11a10.2 10.2 0 012.69-.36c.91.01 1.83.12 2.68.36 2.05-1.4 2.95-1.11 2.95-1.11.59 1.52.22 2.64.11 2.92.69.76 1.11 1.74 1.11 2.92 0 4.18-2.57 5.11-5.01 5.38.39.34.74 1.02.74 2.06 0 1.49-.01 2.69-.01 3.06 0 .29.2.64.76.53 4.34-1.46 7.46-5.54 7.46-10.37C23.16 5.39 18.27.5 12 .5z" fill="currentColor"/>
      </svg>
    )
  },
  {
    id: 'twitter',
    label: 'X',
    url: 'https://x.com/wang_hanzhe',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M23 4.56c-.8.36-1.66.6-2.56.71a4.48 4.48 0 001.96-2.47 8.99 8.99 0 01-2.85 1.09 4.48 4.48 0 00-7.64 4.08 12.72 12.72 0 01-9.24-4.69 4.48 4.48 0 001.39 5.98 4.42 4.42 0 01-2.03-.56v.06a4.48 4.48 0 003.59 4.39c-.5.14-1.04.17-1.58.06a4.5 4.5 0 004.2 3.12A8.99 8.99 0 012 19.54a12.7 12.7 0 006.88 2.01c8.26 0 12.78-6.84 12.78-12.78 0-.19-.01-.39-.02-.58A9.13 9.13 0 0023 4.56z" fill="currentColor"/>
      </svg>
    )
  }
]

export default function App(){
  const { t, i18n } = useTranslation()
  const [copiedId, setCopiedId] = useState(null)

  const changeLang = (event) => {
    const lng = event.target.value
    i18n.changeLanguage(lng)
    try {
      localStorage.setItem('i18nextLng', lng)
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.warn('Unable to save language preference:', err)
    }
  }

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark')
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light')
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.warn('Unable to save theme preference:', err)
    }
  }

  async function copyLink(url, id){
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(id)
      setTimeout(()=> setCopiedId(null), 1500)
    } catch (err) {
      /* 顯示錯誤以避免 ESLint 的 "defined but never used" */
      /* eslint-disable-next-line no-console */
      console.error('Clipboard failed:', err)
      // fallback: prompt
      // window.prompt 會在某些環境被視為阻斷式，但作為 fallback 是合理的
      // 這裡直接顯示原始連結給使用者
      // 注意：t('copy') 是按鈕文字，我們也可以改提示文字
      // 由於 window.prompt 回傳使用者輸入，因此不用其回傳值
      try {
        window.prompt(t('copy'), url)
      } catch (promptErr) {
        /* eslint-disable-next-line no-console */
        console.warn('Prompt fallback failed:', promptErr)
      }
    }
  }

  return (
    <div className="container">
      <main className="profile" role="main" aria-labelledby="profile-title">
        <img src="/avatar.jpg" alt="Avatar" className="avatar" />
        <div style={{textAlign:'center'}}>
          <div id="profile-title" className="h-title">{t('title')}</div>
          <div className="h-sub">{t('subtitle')}</div>
        </div>

        <section className="links" aria-label="links">
          {socials.map(s => (
            <div key={s.id} className="link-card" >
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="link-left"
                style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}
                aria-label={`${s.label} link`}
              >
                <div className="icon" aria-hidden>{s.icon}</div>
                <div>
                  <div style={{fontWeight:600}}>{s.label}</div>
                  <div className="small">{s.url}</div>
                </div>
              </a>

              <div style={{display:'flex', alignItems:'center', gap:8, marginLeft: 12}}>
                {/* button type="button" 保證不會當成 form submit，也方便 ESLint 檢查 event */}
                <button
                  type="button"
                  className="btn"
                  onClick={(event) => {
                    // 停止 link 的冒泡與預設行為，並執行複製
                    event.preventDefault()
                    event.stopPropagation()
                    copyLink(s.url, s.id)
                  }}
                  aria-label={`${t('copy')} ${s.label}`}
                >
                  {t('copy')}
                </button>

                <div className="small">{t('visit')}</div>
              </div>
            </div>
          ))}
        </section>

        <footer style={{width:'100%'}} className="controls" aria-label="controls">
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <button
              className="btn"
              onClick={toggleTheme}
              aria-pressed={document.documentElement.classList.contains('dark')}
              type="button"
            >
              {t('theme')}
            </button>

            <select className="lang-select" value={i18n.language} onChange={changeLang} aria-label="Select language">
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="zh-TW">正體中文</option>
            </select>
          </div>

          <div className="small">{t('builtWith')}</div>
        </footer>
      </main>

      {/* 複製提示（簡易） */}
      <div style={{textAlign:'center', marginTop: 6}}>
        {copiedId && <span className="copied">Copied!</span>}
      </div>
    </div>
  )
}
