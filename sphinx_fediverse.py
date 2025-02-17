from json import dump, load
from os import getenv
from pathlib import Path
from shutil import copyfile

from docutils import nodes
from requests import post
from sphinx.util.docutils import SphinxDirective
from sphinx.util.nodes import nested_parse_with_titles

__version__ = (0, 0, 1)


class MastodonCommentDirective(SphinxDirective):
    required_arguments = {}
    optional_arguments = {}
    option_spec = {}
    has_content = True

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.post_id = None

    def process_post(self, post_url, username):
        """Post a new comment on Mastodon and return the post ID."""
        if not self.config.enable_post_creation:
            if input('Would you like to create the post yourself, and provide the ID? (y/N) ').lower()[0] == 'y':
                return input("Enter the ID and NOTHING ELSE: ")
            else:
                raise RuntimeError(f"Post creation is disabled. Cannot create a post for {post_url}")

        auth_token = getenv("MASTODON_AUTH_TOKEN")  # Fetch auth token from environment
        if not auth_token:
            print("Error: MASTODON_AUTH_TOKEN environment variable is not set.")
            return None

        headers = {'Authorization': f'Bearer {auth_token}'}
        data = {
            "status": f"Discussion for {post_url}",  # You can customize this text
            "visibility": "public",  # Or "unlisted" depending on your use case
            "in_reply_to_id": None  # No reply if it's the first comment
        }
        response = post(f"https://{self.config.mastodon_username}/api/v1/statuses", headers=headers, data=data)
        if response.status_code == 200:
            return response.json()['id']
        else:
            print("Error creating post:", response.status_code)
            return None

    def create_post_if_needed(self, post_url, username):
        """Check if a post exists for this URL. If not, create one."""
        # Read the mapping file
        mapping_file_path = Path(__file__).parent.joinpath(self.config.comments_mapping_file)
        if not mapping_file_path.exists():
            # File doesn't exist, create an empty mapping
            mapping = {}
        else:
            with open(mapping_file_path, "r") as f:
                mapping = load(f)

        # Check if this URL already has a post ID
        if post_url in mapping:
            return mapping[post_url]

        # If not, create the post
        post_id = self.process_post(post_url, username)
        if post_id:
            mapping[post_url] = post_id
            # Save the updated mapping back to the file
            with open(mapping_file_path, "w") as f:
                dump(mapping, f, indent=4)

        return post_id

    def run(self):
        """Main method to execute the directive."""
        # Fetch base URL from conf.py (html_baseurl)
        if self.env.app.builder.name != 'html':
            raise EnvironmentError("Cannot function outside of html build")

        base_url = self.config.html_baseurl
        if not base_url:
            raise ValueError("html_baseurl must be set in conf.py for Mastodon comments to work.")

        self.env.app.add_to_head_flag = True

        # Get the final output document URL using base_url + docname
        docname = self.env.docname
        replace_index_with_slash = self.config.replace_index_with_slash

        # Handle special case for index.html and use configurable URL format
        if docname == "index":
            if replace_index_with_slash:
                post_url = base_url  # Replace index.html with just a slash
            else:
                post_url = base_url + "index.html"  # Keep the index.html
        else:
            post_url = base_url + docname + ".html"  # Always use .html extension

        # Create or retrieve the post ID
        post_id = self.create_post_if_needed(post_url, self.config.mastodon_username)

        if post_id is None:
            return []

        # Create the DOM element to store the post ID
        post_id_node = nodes.raw('', f"""
            <div id="mastodon-post-id" style="display:none;">{post_id}</div>
            <h2>Comments:</h2>
            <div id="comments-section">
            <script>
            document.addEventListener("DOMContentLoaded", function () {{
                const postIdElement = document.getElementById('mastodon-post-id');
                if (postIdElement) {{
                    const postId = postIdElement.textContent || postIdElement.innerText;
                    if (postId) {{
                        // Trigger the comment-fetching logic on page load
                        FetchComments(postId, 5); // Adjust depth as needed
                    }}
                }}
            }});
          </script>
        """, format='html')

        # Add the post ID element to the document
        self.add_name(post_id_node)
        return [post_id_node]


def on_builder_inited(app):
    if app.builder.name != 'html':
        return
    for file_path in Path(__file__).parent.joinpath('_static').iterdir():
        if file_path.is_file():
            out_path = Path(app.builder.outdir, f'{app.config.html_static_path[0]}/{file_path.name}')
            out_path.parent.mkdir(exist_ok=True, parents=True)
            copyfile(file_path, out_path)


def setup(app):
    # Register custom configuration options
    app.add_config_value('mastodon_username', '', 'env')
    app.add_config_value('mastodon_instance', '', 'env')
    app.add_config_value('mastodon_auth_token', '', 'env')
    app.add_config_value('enable_post_creation', True, 'env')
    app.add_config_value('comments_mapping_file', 'comments_mapping.json', 'env')
    app.add_config_value('replace_index_with_slash', True, 'env')

    app.add_directive('mastodon-comments', MastodonCommentDirective)
    app.connect('builder-inited', on_builder_inited)

    app.config.html_js_files.append('fedi_script.js')
    app.config.html_css_files.append('fedi_layout.css')

    return {
        'version': '.'.join(str(x) for x in __version__),
        'parallel_read_safe': True,
        'parallel_write_safe': False,
    }
