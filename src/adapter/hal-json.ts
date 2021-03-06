
import Adapter from '../adapter';
import Resource from '../resource';
import Link from '../resource/link';
import Response from '../client/response';
import * as LinkHeader from 'http-link-header';

export default class HalJson implements Adapter
{
    supports(contentType)
    {
        return contentType.includes('application/hal+json')
            || contentType.includes('application/vnd.error+json');
    }

    accepts(contentType)
    {
        return 'application/hal+json;' + (this.supports(contentType) ? 'q=1' : 'q=0.8');
    }

    build(agent, response: Response, accept: string): Resource
    {
        let body = response.body;
        if (typeof response.body === 'string') {
            body = JSON.parse(response.body);
        }

        let state = {...body};
        delete state._links;
        delete state._embedded;

        let links = this.buildLinks(agent, response, body, accept)
        .concat(LinkHeader.parse(response.getHeader('link') || '').refs.map(link => {
            return new Link(
                link.rel,
                link.title || '',
                link.description || '',
                agent,
                link.type || accept,
                link.uri,
                null,
                link.templated || false,
                link.deprecation || false,
                {tags: link.tags || []}
            );
        }));


        return new Resource(
            response,
            state,
            links,
            []
        );
    }

    buildLinks(agent, response, content, accept) {
        if (!content._links) {
            return [];
        }

        return Object.keys(content._links || {}).map(rel => {
            let links = this.normalizeLinks(content, rel);
            let resolved = new Map();

            let embedded = ((content._embedded || {})[rel] || []);
            if (!Array.isArray(embedded)) {
                embedded = [embedded];
            }

            embedded.forEach(entry => {
                let entryLinks = this.normalizeLinks(entry, 'self');
                let link = entryLinks[0];
                if (link) {
                    resolved.set(link.href, agent.build({
                        url: link.href,
                        status: 200,
                        body: entry,
                        contentType: links[0].type || this.accepts(response.getHeader('Content-Type')),
                        getHeader: () => {}
                    }));
                }
            });

            return links.map(link => new Link(
                rel,
                link.title || '',
                link.description || '',
                agent,
                accept,
                link.href,
                resolved.get(link.href),
                link.templated || false,
                link.deprecation || false,
                {tags: link.tags || []}
            ));
        }).reduce((acc, val) => acc.concat(val), []);
    }

    private normalizeLinks(content, rel)
    {
        let links = (content._links || {})[rel] || [];
        if (typeof links === 'string') {
            links = [{href: links}];
        }

        if (!Array.isArray(links)) {
            links = [links];
        }

        return links;
    }
}

