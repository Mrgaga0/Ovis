import { ContentTemplate } from '../types'

export const educationalVideoTemplate: ContentTemplate = {
  id: 'educational-video',
  name: '교육 비디오',
  type: 'video',
  structure: {
    title: '',
    duration: '',
    targetAudience: '',
    learningObjectives: [],
    script: {
      introduction: '',
      mainContent: [],
      conclusion: ''
    },
    visuals: [],
    metadata: {}
  },
  variables: [
    'title',
    'duration',
    'targetAudience',
    'learningObjectives',
    'script.introduction',
    'script.mainContent',
    'script.conclusion',
    'visuals'
  ],
  rules: {
    title: {
      maxLength: 100,
      required: true
    },
    learningObjectives: {
      minCount: 2,
      maxCount: 5,
      required: true
    },
    script: {
      minLength: 1000,
      required: true
    }
  }
}

export const entertainmentVideoTemplate: ContentTemplate = {
  id: 'entertainment-video',
  name: '엔터테인먼트 비디오',
  type: 'video',
  structure: {
    title: '',
    duration: '',
    genre: '',
    targetAudience: '',
    script: {
      hook: '',
      mainContent: [],
      ending: ''
    },
    scenes: [],
    metadata: {}
  },
  variables: [
    'title',
    'duration',
    'genre',
    'targetAudience',
    'script.hook',
    'script.mainContent',
    'script.ending',
    'scenes'
  ],
  rules: {
    title: {
      maxLength: 100,
      required: true
    },
    script: {
      minLength: 800,
      required: true
    }
  }
}

export const tutorialVideoTemplate: ContentTemplate = {
  id: 'tutorial-video',
  name: '튜토리얼 비디오',
  type: 'video',
  structure: {
    title: '',
    duration: '',
    difficulty: '',
    prerequisites: [],
    steps: [],
    tips: [],
    metadata: {}
  },
  variables: [
    'title',
    'duration',
    'difficulty',
    'prerequisites',
    'steps',
    'tips'
  ],
  rules: {
    title: {
      maxLength: 100,
      required: true
    },
    steps: {
      minCount: 3,
      required: true
    }
  }
} 