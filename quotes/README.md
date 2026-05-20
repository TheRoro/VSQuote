# Quote corpus policy

VSQuote bundles its quote corpus locally. The extension does not fetch quote
text, attribution, or tracking data from a network service.

## Provenance

`provenance.json` records the editorial status and expected size of every
collection. Entries attributed to **VSQuote** are original lines written for
the extension. Other entries came from the extension's legacy attributed
corpus; the original per-entry research notes were not retained. Labels such
as **Anonymous**, **Thought Experiment**, and **Zen Proverb** describe an
unknown or conceptual origin rather than a verified individual author.

The corpus was structurally and editorially reviewed on 2026-08-20. That review
corrected malformed wording, removed normalized duplicates, and introduced
automated checks. Attribution is informational and is not, by itself, evidence
that wording is public domain or licensed for redistribution.

## Attribution and licensing

The repository's software license applies to VSQuote-authored material. It
does not claim ownership of third-party quotations. Before adding or retaining
a third-party quotation for a release, a maintainer should record a reliable
primary source and confirm that at least one of these conditions applies:

- the wording is in the public domain;
- the copyright owner granted redistribution permission;
- the wording is covered by a compatible license; or
- legal review confirms that the intended use is permitted.

If provenance or usage rights cannot be established, replace the entry with an
original VSQuote line or remove it. Do not infer an author from quote websites
or social-media images.

## Validation

Run:

```bash
npm run validate:quotes
```

The validator checks every collection for valid JSON, the expected schema and
count, empty or untrimmed fields, suspicious characters, malformed
contractions, overlong content, normalized duplicates, and complete
provenance-manifest coverage.
