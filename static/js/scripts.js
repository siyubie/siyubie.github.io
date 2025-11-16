

const content_dir = 'contents/'
const built_content_dir = 'contents/content_built/'
const config_file = 'config.yml'
const section_names = ['home', 'research', 'teaching', 'cv', 'events']


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


    // Yaml
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


    // // Marked
    // marked.use({ mangle: false, headerIds: false })
    // section_names.forEach((name, idx) => {
    //     fetch(content_dir + name + '.md')
    //         .then(response => response.text())
    //         .then(markdown => {
    //             const html = marked.parse(markdown);
    //             document.getElementById(name + '-md').innerHTML = html;
    //         }).then(() => {
    //             // MathJax
    //             MathJax.typeset();
    //         })
    //         .catch(error => console.log(error));
    // })

    // 修改：加载预构建的HTML内容而不是Markdown
    section_names.forEach((name, idx) => {
        // 使用预构建的HTML文件
        fetch(built_content_dir + name + '.html')
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(html => {
                document.getElementById(name + '-md').innerHTML = html;
                
                // MathJax - 保持不变
                MathJax.typeset();
            })
            .catch(error => {
                console.log(`Error loading ${name}:`, error);
                // 降级方案：显示加载中或错误信息
                document.getElementById(name + '-md').innerHTML = '<p>Content loading...</p>';
            });
    })

}); 
