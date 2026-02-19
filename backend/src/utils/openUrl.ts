// fetch each and every page
// the LLM itself can't browse the web
// our code -> act as a browser tool, decide exactly what content is safe and what we want the model to show

import { convert } from 'html-to-text';
import { OpenUrlOutputSchema } from './schemas';

export async function openUrl(url: string) {
    // step 1 - validate the url
    const normalized = validateUrl(url);

    // step 2 - fetch the page
    const res = await fetch(normalized, {
        headers: {
            'User-Agent': 'agent-core/1.0 (+course-demo)'
        }
    });

    if (!res.ok) {
        const body = await safeText(res);
        throw new Error(`OpenURL failed ${res.status} - ${body}`);
    }

    // step 3
    const contentType = res.headers.get('Content-Type') ?? '';
    const raw = await res.text();

    // step 4 - raw html -> Parsed
    const text = contentType.includes('text/html') ?
        convert(raw, {
            wordwrap: false,
            selectors: [
                {
                    selector: 'nav', format: 'skip'
                },
                {
                    selector: 'header', format: 'skip'
                },
                {
                    selector: 'footer', format: 'skip'
                },
                {
                    selector: 'script', format: 'skip'
                },
                {
                    selector: 'style', format: 'skip'
                }
            ]
        }) : raw;


    // step 5
    const cleaned = collapseWhitespace(text);
    const capped = cleaned.slice(0, 8000);

    // step 6
    return OpenUrlOutputSchema.parse({
        url: normalized,
        content: capped
    });
}

function validateUrl(url: string) {
    try {
        const parsed = new URL(url);
        // https:
        if (!/^https?:$/.test(parsed.protocol)) {
            throw new Error('only http/https are supported');
        }

        return parsed.toString();
    } catch {
        throw new Error('Invalid Url');
    }
}

async function safeText(response: Response) {
    try {
        return await response.json();
    } catch {
        return "<no body>"
    }
}

function collapseWhitespace(s: string) {
    return s.replace(/\s+/g, " ").trim();
}