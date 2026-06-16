

const content_dir = 'contents/'
// const built_content_dir = 'contents/content_built/'
const config_file = 'config.yml'
const section_names = ['home', 'research']
const ready_timeout_ms = 2500

function revealPage() {
    if (window.__siteRevealFallback) {
        clearTimeout(window.__siteRevealFallback);
    }
    document.body.classList.add('site-ready');
    document.body.classList.remove('site-preparing');
}

function waitWithTimeout(promise, timeoutMs) {
    return Promise.race([
        promise.catch(() => undefined),
        new Promise(resolve => setTimeout(resolve, timeoutMs))
    ]);
}

function waitForBackgroundImage() {
    return new Promise(resolve => {
        const image = new Image();
        image.onload = () => {
            if (image.decode) {
                image.decode().then(resolve).catch(resolve);
            } else {
                resolve();
            }
        };
        image.onerror = resolve;
        image.src = 'static/assets/img/background.jpg';
    });
}

function waitForFonts() {
    if (document.fonts && document.fonts.ready) {
        return document.fonts.ready;
    }
    return Promise.resolve();
}

function typesetMath() {
    if (!window.MathJax) {
        return Promise.resolve();
    }

    const ready = (MathJax.startup && MathJax.startup.promise) ? MathJax.startup.promise : Promise.resolve();
    return ready.then(() => {
        if (MathJax.typesetPromise) return MathJax.typesetPromise();
        if (MathJax.typeset) MathJax.typeset();
        return undefined;
    });
}


window.addEventListener('DOMContentLoaded', event => {

    // Activate Bootstrap scrollspy on the main nav element
    const mainNav = document.body.querySelector('#mainNav');
    if (mainNav) {
        new bootstrap.ScrollSpy(document.body, {
            target: '#mainNav',
            offset: 74,
        });
    };

    // Collapse responsive navbar when toggler is visible
    const navbarToggler = document.body.querySelector('.navbar-toggler');
    const responsiveNavItems = [].slice.call(
        document.querySelectorAll('#navbarResponsive .nav-link')
    );
    responsiveNavItems.map(function (responsiveNavItem) {
        responsiveNavItem.addEventListener('click', () => {
            if (window.getComputedStyle(navbarToggler).display !== 'none') {
                navbarToggler.click();
            }
        });
    });


    const isPrerendered = document.body.dataset.prerendered === 'true';

    // Yaml fallback for non-prerendered pages.
    const configPromise = isPrerendered ? Promise.resolve() :
        fetch(content_dir + config_file)
            .then(response => response.text())
            .then(text => {
                const yml = jsyaml.load(text);
                Object.keys(yml).forEach(key => {
                    try {
                        document.getElementById(key).innerHTML = yml[key];
                    } catch {
                        console.log("Unknown id and value: " + key + "," + yml[key].toString())
                    }

                })
            })
            .catch(error => console.log(error));

    // Markdown fallback for empty sections.
    if (typeof marked !== 'undefined') {
        marked.use({ mangle: false, headerIds: false })
    }
    const sectionPromises = section_names.map((name, idx) => {
        const target = document.getElementById(name + '-md');
        if (target && target.innerHTML.trim()) {
            return Promise.resolve();
        }
        if (typeof marked === 'undefined') {
            return Promise.resolve();
        }
        return fetch(content_dir + name + '.md')
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                target.innerHTML = html;
            })
            .catch(error => console.log(error));
    })

    // // 修改：加载预构建的HTML内容而不是Markdown
    // section_names.forEach((name, idx) => {
    //     // 使用预构建的HTML文件
    //     fetch(built_content_dir + name + '.html')
    //         .then(response => {
    //             if (!response.ok) {
    //                 throw new Error(`HTTP error! status: ${response.status}`);
    //             }
    //             return response.text();
    //         })
    //         .then(html => {
    //             document.getElementById(name + '-md').innerHTML = html;
                
    //             // MathJax - 保持不变
    //             MathJax.typeset();
    //         })
    //         .catch(error => {
    //             console.log(`Error loading ${name}:`, error);
    //             // 降级方案：显示加载中或错误信息
    //             document.getElementById(name + '-md').innerHTML = '<p>Content loading...</p>';
    //         });
    // });

    Promise.all([configPromise, ...sectionPromises])
        .then(typesetMath)
        .then(() => waitWithTimeout(Promise.all([waitForBackgroundImage(), waitForFonts()]), ready_timeout_ms))
        .then(revealPage)
        .catch(error => {
            console.log(error);
            revealPage();
        });

}); 
