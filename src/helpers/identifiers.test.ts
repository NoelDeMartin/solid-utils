import { parseResourceSubject } from '@/helpers/identifiers';

describe('Identifiers helpers', () => {

    it('parses subjects', () => {
        expect(parseResourceSubject('https://my-pod.com/profile/card#me')).toEqual({
            containerUrl: 'https://my-pod.com/profile/',
            documentName: 'card',
            resourceHash: 'me',
        });
        expect(parseResourceSubject('https://my-pod.com/about')).toEqual({
            containerUrl: 'https://my-pod.com/',
            documentName: 'about',
        });
        expect(parseResourceSubject('/profile/card#me')).toEqual({
            containerUrl: '/profile/',
            documentName: 'card',
            resourceHash: 'me',
        });
        expect(parseResourceSubject('/about#sections')).toEqual({
            containerUrl: '/',
            documentName: 'about',
            resourceHash: 'sections',
        });
        expect(parseResourceSubject('about#sections')).toEqual({
            documentName: 'about',
            resourceHash: 'sections',
        });
        expect(parseResourceSubject('about')).toEqual({
            documentName: 'about',
        });
        expect(parseResourceSubject('')).toEqual({});
    });

});
