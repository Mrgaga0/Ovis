import { ContentTemplate } from '../types'

export const twitterPostTemplate: ContentTemplate = {
  id: 'twitter-post',
  name: '트위터 포스트',
  type: 'social',
  structure: {
    content: '',
    hashtags: [],
    mentions: [],
    media: [],
    metadata: {}
  },
  variables: [
    'content',
    'hashtags',
    'mentions',
    'media'
  ],
  rules: {
    content: {
      maxLength: 280,
      required: true
    },
    hashtags: {
      maxCount: 5,
      required: false
    }
  }
}

export const linkedinPostTemplate: ContentTemplate = {
  id: 'linkedin-post',
  name: '링크드인 포스트',
  type: 'social',
  structure: {
    title: '',
    content: '',
    hashtags: [],
    mentions: [],
    media: [],
    metadata: {}
  },
  variables: [
    'title',
    'content',
    'hashtags',
    'mentions',
    'media'
  ],
  rules: {
    title: {
      maxLength: 100,
      required: true
    },
    content: {
      maxLength: 3000,
      required: true
    },
    hashtags: {
      maxCount: 10,
      required: false
    }
  }
}

export const instagramPostTemplate: ContentTemplate = {
  id: 'instagram-post',
  name: '인스타그램 포스트',
  type: 'social',
  structure: {
    caption: '',
    hashtags: [],
    mentions: [],
    media: [],
    location: '',
    metadata: {}
  },
  variables: [
    'caption',
    'hashtags',
    'mentions',
    'media',
    'location'
  ],
  rules: {
    caption: {
      maxLength: 2200,
      required: true
    },
    hashtags: {
      maxCount: 30,
      required: false
    },
    media: {
      minCount: 1,
      maxCount: 10,
      required: true
    }
  }
} 