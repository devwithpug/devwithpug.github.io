const defaultTheme = [...document.styleSheets].find(style => /(main.css)$/.test(style.href));
const darkTheme = [...document.styleSheets].find(style => /(main_dark.css)$/.test(style.href));

let setDarkMode = (isDark) => {
    darkTheme.disabled = isDark !== true;
    defaultTheme.disabled = isDark === true;
    localStorage.setItem('theme', isDark ? 'dark' : 'default');
}

if (darkTheme) {
    let currentTheme = localStorage.getItem('theme');
    let isDarkMode = false;
    if (currentTheme) {
        isDarkMode = currentTheme === 'dark';
    } else {
        isDarkMode = matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setDarkMode(isDarkMode);

    let toggleThemeBtn = document.getElementById("toggle_dark_theme")
    if (toggleThemeBtn) {
        toggleThemeBtn.checked = isDarkMode
    }

    let changeTheme = (e) => {
        setDarkMode(e.target.checked);
    }

    let utterancesTheme = () => {
        if (document.querySelector('.utterances-frame')) {
            const theme = localStorage.theme === 'dark' ? 'github-dark' : 'github-light';
            const message = {
                type: 'set-theme',
                theme: theme
            };
            const iframe = document.querySelector('.utterances-frame');
            iframe.contentWindow.postMessage(message, 'https://utteranc.es');
        }
    }

    toggleThemeBtn.addEventListener('click', changeTheme);
    toggleThemeBtn.addEventListener('click', utterancesTheme);
    // toggleThemeBtn.addEventListener('click', function(e) {console.log(this)});
}