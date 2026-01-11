# Projects
Each project lives in its own folder under `projects/`.

## New project checklist
1. Create a new folder: `projects/<slug>/`.
2. Add an `index.html` entry point.
3. Add a short description to `projects/index.html`.
4. Link it from the home page (`index.html`).

## Minimal HTML template
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Project Name | theispitar</title>
    <link rel="stylesheet" href="/assets/css/main.css">
  </head>
  <body>
    <main class="main-container">
      <h1 class="section-title">Project Name</h1>
      <p class="tagline">Short description.</p>
      <p><a class="project-link" href="/">Back to home</a></p>
    </main>
  </body>
</html>
```
