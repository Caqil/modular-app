import os
from pathlib import Path

def create_structure():
    # Define the base directory
    base_dir = Path("apps/admin")
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
            "admin-logo.svg": "",
            "images": {
                "avatar-placeholder.png": "",
                "admin-bg.jpg": ""
            }
        },
        "src": {
            "app": {
                "globals.css": "",
                "layout.tsx": "",
                "loading.tsx": "",
                "not-found.tsx": "",
                "page.tsx": "",
                "auth": {
                    "login": {"page.tsx": ""},
                    "layout.tsx": "",
                    "forgot-password": {"page.tsx": ""}
                },
                "dashboard": {
                    "page.tsx": "",
                    "loading.tsx": "",
                    "error.tsx": ""
                },
                "content": {
                    "page.tsx": "",
                    "layout.tsx": "",
                    "posts": {
                        "page.tsx": "",
                        "new": {"page.tsx": ""},
                        "[id]": {"page.tsx": "", "edit": {"page.tsx": ""}}
                    },
                    "pages": {
                        "page.tsx": "",
                        "new": {"page.tsx": ""},
                        "[id]": {"page.tsx": "", "edit": {"page.tsx": ""}}
                    },
                    "media": {
                        "page.tsx": "",
                        "upload": {"page.tsx": ""}
                    },
                    "categories": {
                        "page.tsx": "",
                        "new": {"page.tsx": ""}
                    }
                },
                "plugins": {
                    "page.tsx": "",
                    "layout.tsx": "",
                    "marketplace": {"page.tsx": ""},
                    "installed": {"page.tsx": ""},
                    "[slug]": {"page.tsx": "", "settings": {"page.tsx": ""}}
                },
                "users": {
                    "page.tsx": "",
                    "layout.tsx": "",
                    "new": {"page.tsx": ""},
                    "roles": {"page.tsx": "", "[id]": {"page.tsx": ""}},
                    "[id]": {"page.tsx": "", "edit": {"page.tsx": ""}}
                },
                "settings": {
                    "page.tsx": "",
                    "layout.tsx": "",
                    "general": {"page.tsx": ""},
                    "security": {"page.tsx": ""},
                    "email": {"page.tsx": ""},
                    "performance": {"page.tsx": ""}
                },
                "api": {
                    "auth": {
                        "login": {"route.ts": ""},
                        "me": {"route.ts": ""}
                    },
                    "content": {
                        "posts": {"route.ts": "", "[id]": {"route.ts": ""}},
                        "pages": {"route.ts": "", "[id]": {"route.ts": ""}},
                        "media": {"route.ts": "", "upload": {"route.ts": ""}, "[id]": {"route.ts": ""}}
                    },
                    "plugins": {
                        "route.ts": "",
                        "install": {"route.ts": ""},
                        "[slug]": {
                            "route.ts": "",
                            "activate": {"route.ts": ""},
                            "deactivate": {"route.ts": ""},
                            "configure": {"route.ts": ""},
                            "uninstall": {"route.ts": ""}
                        }
                    },
                    "users": {
                        "route.ts": "",
                        "[id]": {
                            "route.ts": "",
                            "roles": {"route.ts": ""},
                            "permissions": {"route.ts": ""}
                        }
                    },
                    "settings": {
                        "route.ts": "",
                        "general": {"route.ts": ""},
                        "security": {"route.ts": ""},
                        "email": {"route.ts": ""}
                    }
                }
            },
            "components": {
                "layout": {
                    "admin-header.tsx": "",
                    "admin-sidebar.tsx": "",
                    "breadcrumbs.tsx": "",
                    "mobile-nav.tsx": "",
                    "user-nav.tsx": ""
                },
                "dashboard": {
                    "stats-cards.tsx": "",
                    "recent-activity.tsx": "",
                    "plugin-status.tsx": "",
                    "system-health.tsx": "",
                    "quick-actions.tsx": ""
                },
                "content": {
                    "content-table.tsx": "",
                    "content-form.tsx": "",
                    "rich-text-editor.tsx": "",
                    "media-library.tsx": "",
                    "media-upload.tsx": "",
                    "content-filters.tsx": ""
                },
                "plugins": {
                    "plugin-card.tsx": "",
                    "plugin-table.tsx": "",
                    "plugin-install-dialog.tsx": "",
                    "plugin-settings-form.tsx": "",
                    "plugin-marketplace.tsx": ""
                },
                "users": {
                    "user-table.tsx": "",
                    "user-form.tsx": "",
                    "role-form.tsx": "",
                    "permissions-form.tsx": "",
                    "user-filters.tsx": ""
                },
                "settings": {
                    "settings-form.tsx": "",
                    "security-settings.tsx": "",
                    "email-settings.tsx": "",
                    "performance-settings.tsx": ""
                },
                "common": {
                    "data-table.tsx": "",
                    "loading-spinner.tsx": "",
                    "empty-state.tsx": "",
                    "error-boundary.tsx": "",
                    "confirmation-dialog.tsx": "",
                    "search-input.tsx": ""
                }
            },
            "hooks": {
                "use-auth.ts": "",
                "use-plugins.ts": "",
                "use-content.ts": "",
                "use-users.ts": "",
                "use-settings.ts": "",
                "use-toast.ts": "",
                "use-local-storage.ts": ""
            },
            "lib": {
                "auth.ts": "",
                "api.ts": "",
                "database.ts": "",
                "plugins.ts": "",
                "utils.ts": "",
                "validations.ts": "",
                "constants.ts": "",
                "middleware.ts": ""
            },
            "providers": {
                "auth-provider.tsx": "",
                "plugin-provider.tsx": "",
                "toast-provider.tsx": "",
                "query-provider.tsx": ""
            },
            "styles": {
                "globals.css": "",
                "components.css": "",
                "admin.css": ""
            },
            "types": {
                "auth.ts": "",
                "content.ts": "",
                "plugins.ts": "",
                "users.ts": "",
                "settings.ts": "",
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
