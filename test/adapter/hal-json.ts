
import HalJson from '../../src/adapter/hal-json';
import HalForms from '../../src/adapter/hal-forms';
import Agent from '../../src/agent';
import * as fs from 'fs'


const adapter = new HalJson();
const agent = new Agent([adapter, new HalForms(adapter)], (method, url, params, headers) => {
    return Promise.resolve({
        url: url,
        status: 200,
        getHeader: (name) => ({'content-type': 'application/hal+json'}[name.toLowerCase()]) || null,
        contentType: 'application/hal+json',
        body: '{}'
    });
});

test('populates links', async () => {
    let resource = await adapter.build(agent, {
        url: 'http://example.com',
        status: 200,
        contentType: 'application/hal+json',
        getHeader: (name) => ({'content-type': 'application/hal+json'}[name.toLowerCase()]) || null,
        body: fs.readFileSync('test/format/hal/example.json').toString(),
    }, 'application/hal+json');

    expect(resource.links).toHaveLength(6);

    let found = await resource.follow('ea:find', {id: 'test'});
    expect(found.url).toBe('/orders?id=test');
});

test('uses embedded', async () => {
    let resource = await adapter.build(agent, {
        url: 'http://example.com',
        status: 200,
        contentType: 'application/hal+json',
        getHeader: (name) => ({'content-type': 'application/hal+json'}[name.toLowerCase()]) || null,
        body: fs.readFileSync('test/format/hal/collection.json').toString(),
    }, 'application/hal+json');

    expect(resource.followAll('item')).toHaveLength(30);
});

test('populates operations', async () => {
    let resource = await adapter.build(agent, {
        url: 'http://example.com',
        status: 200,
        contentType: 'application/hal+json',
        getHeader: (name) => ({'content-type': 'application/hal+json'}[name.toLowerCase()]) || null,
        body: fs.readFileSync('test/format/hal/collection.json').toString(),
    }, 'application/hal+json');

    //let op = resource.operation('activate');
    let op = await resource.follow('activate').then(r => r.operation('default'));
    expect(op.fields).toHaveLength(2);
    expect(op.fields[0]).toEqual({name: 'when', required : true, type: 'datetime', value: '2018-04-22T16:45:25+02:00'});
    expect(op.fields[1]).toEqual({name: 'reason', required : false, type: 'string', value: 'because'});
});
