import os
from pathlib import Path

def create_structure():
    # Define the base directory
    base_dir = Path("apps/web")
    base_dir.mkdir(parents=True, exist_ok=True)

    # Define the file and folder structure
    structure = {
        ".env.example": "",
        ".env.local": "",
        ".eslintrc.js": "",
        ".gitignore": "",
        "next.config.js": "",
        "package.json": "",
        "postcss.config.js": "",
        "tailwind.config.js": "",
        "tsconfig.json": "",
        "middleware.ts": "",
        "public": {
            "favicon.ico": "",
            "logo.svg": "",
            "og-image.png": "",
            "images": {
                "hero-bg.jpg": "",
                "placeholder.png": ""
            }
        },
        "src": {
            "app": {
                "globals.css": "",
                "layout.tsx": "",
                "loading.tsx": "",
                "not-found.tsx": "",
                "page.tsx": "",
                "about": {"page.tsx": ""},
                "contact": {"page.tsx": ""},
                "blog": {
                    "page.tsx": "",
                    "[slug]": {"page.tsx": ""},
                    "category": {"[category]": {"page.tsx": ""}}
                },
                "auth": {
                    "login": {"page.tsx": ""},
                    "register": {"page.tsx": ""},
                    "forgot-password": {"page.tsx": ""}
                },
                "account": {
                    "page.tsx": "",
                    "profile": {"page.tsx": ""},
                    "settings": {"page.tsx": ""}
                },
                "api": {
                    "auth": {
                        "login": {"route.ts": ""},
                        "register": {"route.ts": ""},
                        "me": {"route.ts": ""}
                    },
                    "content": {
                        "posts": {"route.ts": "", "[slug]": {"route.ts": ""}},
                        "pages": {"route.ts": "", "[slug]": {"route.ts": ""}}
                    },
                    "contact": {"route.ts": ""},
                    "plugins": {"[plugin]": {"[...path]": {"route.ts": ""}}}
                }
            },
            "components": {
                "layout": {
                    "header.tsx": "",
                    "footer.tsx": "",
                    "navigation.tsx": "",
                    "mobile-nav.tsx": ""
                },
                "sections": {
                    "hero.tsx": "",
                    "features.tsx": "",
                    "blog-preview.tsx": ""
                },
                "blog": {
                    "post-card.tsx": "",
                    "post-content.tsx": "",
                    "category-filter.tsx": ""
                },
                "auth": {
                    "login-form.tsx": "",
                    "register-form.tsx": "",
                    "auth-guard.tsx": ""
                },
                "forms": {
                    "contact-form.tsx": ""
                },
                "plugins": {
                    "plugin-renderer.tsx": ""
                },
                "common": {
                    "seo.tsx": "",
                    "breadcrumbs.tsx": "",
                    "pagination.tsx": "",
                    "loading-spinner.tsx": ""
                }
            },
            "hooks": {
                "use-auth.ts": "",
                "use-posts.ts": "",
                "use-plugins.ts": "",
                "use-local-storage.ts": ""
            },
            "lib": {
                "auth.ts": "",
                "api.ts": "",
                "utils.ts": "",
                "validations.ts": "",
                "constants.ts": "",
                "seo.ts": "",
                "plugins.ts": ""
            },
            "providers": {
                "auth-provider.tsx": "",
                "plugin-provider.tsx": "",
                "toast-provider.tsx": ""
            },
            "styles": {
                "globals.css": "",
                "components.css": ""
            },
            "types": {
                "auth.ts": "",
                "content.ts": "",
                "plugins.ts": "",
                "api.ts": ""
            }
        }
    }

    def create_files_and_dirs(parent_path, items):
        for name, content in items.items():
            current_path = parent_path / name
            if isinstance(content, dict):
                # Create directory
                current_path.mkdir(exist_ok=True)
                # Recursively create subdirectories and files
                create_files_and_dirs(current_path, content)
            else:
                # Create file with empty content
                with open(current_path, "w") as f:
                    f.write(content)

    # Create the structure
    create_files_and_dirs(base_dir, structure)
    print(f"Directory structure created successfully at {base_dir}")

if __name__ == "__main__":
    create_structure()