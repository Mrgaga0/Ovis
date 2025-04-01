import { ContentTemplate } from '../types'

export const newsArticleTemplate: ContentTemplate = {
  id: 'news-article',
  name: '뉴스 기사',
  type: 'article',
  structure: {
    title: '',
    subtitle: '',
    author: '',
    date: '',
    category: '',
    tags: [],
    content: {
      introduction: '',
      body: [],
      conclusion: ''
    },
    sources: [],
    metadata: {}
  },
  variables: [
    'title',
    'subtitle',
    'author',
    'date',
    'category',
    'tags',
    'content.introduction',
    'content.body',
    'content.conclusion',
    'sources'
  ],
  rules: {
    title: {
      maxLength: 100,
      required: true
    },
    subtitle: {
      maxLength: 200,
      required: false
    },
    content: {
      minLength: 500,
      required: true
    }
  }
}

export const blogPostTemplate: ContentTemplate = {
  id: 'blog-post',
  name: '블로그 포스트',
  type: 'article',
  structure: {
    title: '',
    author: '',
    date: '',
    category: '',
    tags: [],
    content: {
      introduction: '',
      sections: [],
      conclusion: ''
    },
    images: [],
    metadata: {}
  },
  variables: [
    'title',
    'author',
    'date',
    'category',
    'tags',
    'content.introduction',
    'content.sections',
    'content.conclusion',
    'images'
  ],
  rules: {
    title: {
      maxLength: 100,
      required: true
    },
    content: {
      minLength: 1000,
      required: true
    }
  }
}

export const academicArticleTemplate: ContentTemplate = {
  id: 'academic-article',
  name: '학술 기사',
  type: 'article',
  structure: {
    title: '',
    authors: [],
    abstract: '',
    keywords: [],
    introduction: '',
    methods: '',
    results: '',
    discussion: '',
    conclusion: '',
    references: [],
    metadata: {}
  },
  variables: [
    'title',
    'authors',
    'abstract',
    'keywords',
    'introduction',
    'methods',
    'results',
    'discussion',
    'conclusion',
    'references'
  ],
  rules: {
    title: {
      maxLength: 200,
      required: true
    },
    abstract: {
      minLength: 150,
      maxLength: 300,
      required: true
    },
    keywords: {
      minCount: 3,
      maxCount: 10,
      required: true
    }
  }
} 