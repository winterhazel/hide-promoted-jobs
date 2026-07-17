# Hide Promoted Jobs

Automatically hides promoted job postings on LinkedIn's job search pages.

<div align="center">
  <img src=".github/images/before.png" alt="Before" width="49%"> <img src=".github/images/after.png" alt="After" width="49%">
</div>

## Installation

### Chrome

[![](.github/images/chrome-web-store.png)](https://chrome.google.com/webstore/detail/hide-promoted-jobs/bmilkimafelnhekidknkamkhkbeciijg/)

### Firefox

[![](.github/images/firefox-marketplace.png)](https://addons.mozilla.org/en-US/firefox/addon/hide-promoted-jobs/)

The `1.6.0` source update is verified in Chrome and Brave. Firefox support for
this update has not been verified.

## Usage

You can click on the extension to toggle it off/on. When enabled, the extension will automatically hide promoted job postings.

<div align="center">
  <img src=".github/images/usage.gif" alt="Usage">
</div>

## Development

```bash
npm ci
npm run check
npm run release
```

See [`docs/maintenance.md`](docs/maintenance.md) for the sanitized fixture,
regression, browser-verification, release, and rollback workflow.

## License

This software is distributed under the MIT License in the hope that it will be useful, but WITHOUT ANY WARRANTY. See `LICENSE` for more information.

## Contact

Fabricio Duarte Júnior - fabricio.duarte.jr@gmail.com

## Acknowledgements

This extension was based on u/mothibault's script available [here](https://www.reddit.com/r/linkedin/comments/nhzcyz/comment/hrdq2fk).
