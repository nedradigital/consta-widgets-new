import React from 'react'

import { isNotNil } from '@consta/widgets-utils/lib/type-guards'
import * as d3 from 'd3'
import * as _ from 'lodash'

import { FormatValue } from '@/__private__/types'
import { cn } from '@/__private__/utils/bem'
import { ScaleLinear, TickValues } from '@/LinearChart/LinearChart'

import { isInDomain } from '../helpers'

import './Frame.css'

const cnFrame = cn('Frame')

const TICK_PADDING = 15
const X_TICK_OFFSET = 18
export const UNIT_Y_MARGIN = 8

type GridConfigItem = {
  min?: number
  max?: number
  showGuide?: boolean
  showGrid?: boolean
  gridTicks?: number
  withPaddings?: boolean
}

export type GridConfig = {
  x: GridConfigItem
  y: GridConfigItem
}

enum AxisDirections {
  bottom = 'axisBottom',
  left = 'axisLeft',
}

type Props = {
  width: number
  height: number
  gridConfig: GridConfig
  scales: {
    [key in 'x' | 'y']: ScaleLinear
  }
  xGridTickValues: TickValues
  yGridTickValues: TickValues
  yDimensionUnit?: string
  yLabelsShowInPercent: boolean
  xLabelsShowVertical: boolean
  xHideFirstLabel: boolean
  formatValueForLabel?: FormatValue
  onFrameSizeChange: (sizes: { xAxisHeight: number; yAxisWidth: number }) => void
  hideYLabels?: boolean
  showOnlyY?: boolean
}

const defaultFormatLabel = (v: number) => String(v)

const addGuideToTicks = (ticks: TickValues, guideValue: number | undefined): TickValues =>
  isNotNil(guideValue) ? _.sortBy(_.uniq([...ticks, guideValue])) : ticks

const getGuideValue = ({
  showGuide,
  value,
  domain,
}: {
  showGuide: boolean | undefined
  value: number
  domain: readonly number[]
}): number | undefined => (showGuide && isInDomain(value, domain) ? value : undefined)

export const getGridTicksWithGuide = ({
  xTickValues,
  yTickValues,
  xGuideValue,
  yGuideValue,
}: {
  xTickValues: TickValues
  yTickValues: TickValues
  xGuideValue: number | undefined
  yGuideValue: number | undefined
}): { x: TickValues; y: TickValues } => ({
  x: addGuideToTicks(xTickValues, xGuideValue),
  y: addGuideToTicks(yTickValues, yGuideValue),
})

export const Frame: React.FC<Props> = props => {
  const {
    width,
    height,
    gridConfig: {
      x: { showGuide: xShowGuide, showGrid: xShowGrid = true },
      y: { showGuide: yShowGuide, showGrid: yShowGrid = true },
    },
    scales: { x: scaleX, y: scaleY },
    xGridTickValues,
    yGridTickValues,
    yDimensionUnit,
    yLabelsShowInPercent,
    xLabelsShowVertical,
    xHideFirstLabel,
    formatValueForLabel = defaultFormatLabel,
    onFrameSizeChange,
    hideYLabels = false,
    showOnlyY = false,
  } = props

  const xGridRef = React.useRef<SVGGElement>(null)
  const yGridRef = React.useRef<SVGGElement>(null)
  const xLabelsRef = React.useRef<SVGGElement>(null)
  const yLabelsRef = React.useRef<SVGGElement>(null)
  const yUnitRef = React.useRef<SVGTextElement>(null)
  const [xAxisHeight, setXAxisHeight] = React.useState<number>(0)
  const [yAxisWidth, setYAxisWidth] = React.useState<number>(0)

  const { x: xGridTicks, y: yGridTicks } = getGridTicksWithGuide({
    xTickValues: xGridTickValues,
    yTickValues: yGridTickValues,
    xGuideValue: getGuideValue({
      showGuide: xShowGuide,
      value: 0,
      domain: scaleX.domain(),
    }),
    yGuideValue: getGuideValue({
      showGuide: yShowGuide,
      value: 0,
      domain: scaleY.domain(),
    }),
  })

  const areGridsHidden = !xShowGrid && !yShowGrid
  const xShowLabels = xShowGrid || (Boolean(xGridTicks.length) && areGridsHidden)
  const yShowLabels = yShowGrid || (Boolean(yGridTicks.length) && areGridsHidden)

  const updatePaddings = () => {
    const xAxisLabelsHeight = xLabelsRef.current
      ? xLabelsRef.current.getBoundingClientRect().height
      : 0

    const yAxisLabelsWidth = yLabelsRef.current
      ? yLabelsRef.current.getBoundingClientRect().width
      : 0

    setXAxisHeight(xAxisLabelsHeight + UNIT_Y_MARGIN)
    setYAxisWidth(yAxisLabelsWidth)
  }

  const resizeObserver = new ResizeObserver(() => updatePaddings())

  const labelsAxis = React.useMemo(
    () => [
      {
        getEl: () => xLabelsRef.current,
        direction: AxisDirections.bottom,
        scale: scaleX,
        ticks: xGridTicks,
        classes: cnFrame('Labels', { isAxisX: true }),
        transform: `translateY(${height}px)`,
        values: xGridTickValues,
        formatLabel: formatValueForLabel,
      },
      {
        getEl: () => yLabelsRef.current,
        direction: AxisDirections.left,
        scale: scaleY,
        ticks: yGridTicks,
        classes: cnFrame('Labels', { isAxisY: true }),
        transform: '',
        values: yGridTickValues,
        formatLabel: yLabelsShowInPercent ? d3.format('.0%') : defaultFormatLabel,
      },
    ],
    [
      formatValueForLabel,
      xGridTicks,
      xGridTickValues,
      yGridTicks,
      yGridTickValues,
      height,
      yLabelsShowInPercent,
      scaleX,
      scaleY,
      xLabelsRef,
      yLabelsRef,
    ]
  )

  React.useLayoutEffect(() => {
    labelsAxis.forEach(labels => {
      const labelsSelection = d3.select(labels.getEl())

      labelsSelection.select('g').remove()

      labelsSelection.append('g')
    })
  }, [labelsAxis])

  React.useLayoutEffect(() => {
    // Labels
    labelsAxis.forEach(labels => {
      const axisSelection = d3.select(labels.getEl()).select('g') as d3.Selection<
        SVGGElement,
        unknown,
        null,
        undefined
      >
      const axis = d3[labels.direction](labels.scale)
        .tickValues([...labels.values])
        .tickPadding(labels.direction === AxisDirections.left ? TICK_PADDING : TICK_PADDING / 2)
        .tickFormat(v => labels.formatLabel(v as number))

      axisSelection
        .attr('class', labels.classes)
        .style('transform', labels.transform)
        .call(axis)
        .selectAll('text')
        .style('text-anchor', (_datum, index, els) => {
          if (labels.direction === 'axisBottom') {
            if (index === 0) {
              return 'start'
            }
            if (index === els.length - 1) {
              return 'end'
            }
            return 'middle'
          } else {
            return ''
          }
        })

      xLabelsShowVertical &&
        axisSelection
          .call(axis)
          .selectAll('text')
          .style(
            'transform',
            labels.direction === 'axisBottom' &&
              `rotate(-90deg) translate3d(-${TICK_PADDING}px, -${X_TICK_OFFSET}px, 0)`
          )
          .style('text-anchor', labels.direction === 'axisBottom' && 'end')

      xHideFirstLabel &&
        axisSelection
          .call(axis)
          .selectAll('text')
          .style('visibility', (_datum, index) => {
            if (labels.direction === 'axisBottom' && index === 0) {
              return 'hidden'
            } else {
              return ''
            }
          })
    })

    // Grid lines
    const xGridBase = d3
      .axisBottom(scaleX)
      .tickSize(height)
      .tickFormat(() => '')
    const yGridBase = d3
      .axisLeft(scaleY)
      .tickSize(-width)
      .tickFormat(() => '')

    const grids = [
      {
        el: xGridRef.current,
        axis: xGridBase.tickValues([...xGridTicks]),
        withGuide: xShowGuide,
        guideValue: 0,
      },
      {
        el: yGridRef.current,
        axis: yGridBase.tickValues([...yGridTicks]),
        withGuide: yShowGuide,
        guideValue: 0,
      },
    ] as const

    grids.forEach(grid => {
      if (grid.el) {
        d3.select(grid.el)
          .call(grid.axis)
          .selectAll('.tick')
          .select('line')
          .attr('class', d => (grid.withGuide && d === grid.guideValue ? cnFrame('AxisLine') : ''))
          .style('visibility', (_datum, index) => {
            if (areGridsHidden) {
              return index > 0 ? 'hidden' : ''
            } else {
              return ''
            }
          })
      }
    })
  })

  React.useEffect(() => {
    const xLabelsRefObj = xLabelsRef.current!
    const yLabelsRefObj = yLabelsRef.current!
    xShowLabels && !showOnlyY && resizeObserver.observe(xLabelsRefObj)
    yShowLabels && resizeObserver.observe(yLabelsRefObj)

    return () => {
      xShowLabels && !showOnlyY && resizeObserver.unobserve(xLabelsRefObj)
      yShowLabels && resizeObserver.unobserve(yLabelsRefObj)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    onFrameSizeChange({ xAxisHeight, yAxisWidth })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xAxisHeight, yAxisWidth])

  const renderY = () => {
    return (
      yShowLabels && (
        <>
          <g ref={yLabelsRef} className={cnFrame(null, { isYLabelsHidden: hideYLabels })} />
          <g ref={yUnitRef} className={cnFrame(null, { isYLabelsHidden: hideYLabels })}>
            {yDimensionUnit && (
              <text className={cnFrame('Labels', { isAxisY: true }, ['Unit'])}>
                {yDimensionUnit}
              </text>
            )}
          </g>
        </>
      )
    )
  }

  return showOnlyY ? (
    <g className={cnFrame()}>{renderY()}</g>
  ) : (
    <g className={cnFrame()}>
      {(xShowGrid || areGridsHidden) && <g className={cnFrame('Grid')} ref={xGridRef} />}
      {(yShowGrid || areGridsHidden) && <g className={cnFrame('Grid')} ref={yGridRef} />}

      {xShowLabels && <g ref={xLabelsRef} />}

      {renderY()}
    </g>
  )
}
