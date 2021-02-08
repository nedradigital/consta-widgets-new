import * as React from 'react'

import { createMetadata } from '@/__private__/storybook'
import { cn } from '@/__private__/utils/bem'

import { Component } from '../Component'

import mdx from './Component.mdx'
import './Component.stories.css'

const cnComponentStories = cn('ComponentStories')

export const Playground = () => (
  <div className={cnComponentStories()}>
    <Component />
  </div>
)

export default createMetadata({
  title: 'Компоненты|/Component',
  id: 'components/Component',
  parameters: {
    docs: {
      page: mdx,
    },
  },
})
