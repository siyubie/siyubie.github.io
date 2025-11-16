# build_site.py
import markdown
import os
import json
from pathlib import Path

def build_site():
    # 确保输出目录存在
    output_dir = Path('contents/content_built')
    output_dir.mkdir(exist_ok=True)
    
    sections = ['home', 'research', 'teaching', 'cv', 'events']
    
    for section in sections:
        md_path = f'contents/{section}.md'
        html_path = output_dir / f'{section}.html'
        
        print(f"Building {section}...")
        
        if os.path.exists(md_path):
            with open(md_path, 'r', encoding='utf-8') as f:
                md_content = f.read()
            
            # 转换Markdown为HTML
            html_content = markdown.markdown(
                md_content, 
                extensions=['extra', 'toc']
            )
            
            # 保存为HTML文件
            with open(html_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
            
            print(f"✓ {section} built successfully")
        else:
            print(f"✗ {md_path} not found")
    
    print("Build completed!")

if __name__ == '__main__':
    build_site()