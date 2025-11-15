import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  FormControl,
  FormHelperText,
  Grid,
  Input,
  List,
  ListItem,
  Option,
  Radio,
  RadioGroup,
  Select,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect } from 'react'

import { useUserProfile } from '../../queries/UserQueries'
import { isPlusAccount } from '../../utils/Helpers'
import ThingTriggerSection from './ThingTriggerSection'

const FREQUENCY_TYPES_RADIOS = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'adaptive',
  'custom',
]

const FREQUENCY_TYPE_MESSAGE = {
  adaptive:
    '此任务将根据之前的完成日期动态安排。',
  custom: '此任务将根据自定义频率安排。',
}
const REPEAT_ON_TYPE = ['interval', 'days_of_the_week', 'day_of_the_month']
const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

const WEEK_PATTERNS = {
  every_week: '每周',
  nth_day_of_month: '月中特定时间',
}

const DAY_OCCURRENCE_OPTIONS = [
  { value: 1, label: '第1次' },
  { value: 2, label: '第2次' },
  { value: 3, label: '第3次' },
  { value: 4, label: '第4次' },
  { value: -1, label: '最后一次' },
]
// Helper function to generate schedule preview text
const generateSchedulePreview = metadata => {
  if (!metadata?.days?.length) return ''

  const dayNames = metadata.days
    .map(day => day.charAt(0).toUpperCase() + day.slice(1, 3))
    .join(', ')

  const timeStr = metadata.time
    ? moment(metadata.time).format('h:mm A')
    : '6:00 PM'

  if (metadata.weekPattern === 'every_week' || !metadata.weekPattern) {
    return `Every ${dayNames} at ${timeStr}`
  }

  if (
    metadata.weekPattern === 'nth_day_of_month' &&
    metadata.occurrences?.length
  ) {
    const occurrenceStr = metadata.occurrences
      .map(w => {
        if (w === -1) return 'last'
        return `${w}${w === 1 ? 'st' : w === 2 ? 'nd' : w === 3 ? 'rd' : 'th'}`
      })
      .join(', ')
    return `Every ${occurrenceStr} ${dayNames} of the month at ${timeStr}`
  }

  return `Every ${dayNames} at ${timeStr}`
}

const RepeatOnSections = ({
  frequencyType,
  frequency,
  onFrequencyUpdate,
  frequencyMetadata,
  onFrequencyMetadataUpdate,
}) => {
  // if time on frequencyMetadata is not set, try to set it to the nextDueDate if available,
  // otherwise set it to 18:00 of the current day
  useEffect(() => {
    if (!frequencyMetadata?.time) {
      frequencyMetadata.time = moment(
        moment(new Date()).format('YYYY-MM-DD') + 'T' + '18:00',
      ).format()
    }
    // Initialize weekPattern if not set
    if (!frequencyMetadata?.weekPattern) {
      onFrequencyMetadataUpdate({
        ...frequencyMetadata,
        weekPattern: 'every_week',
        occurrences: [],
      })
    }
  }, [frequencyMetadata, onFrequencyMetadataUpdate])

  const timePickerComponent = (
    <Grid
      item
      sm={12}
      sx={{
        display: 'flex',
        direction: 'column',
        flexDirection: 'column',
      }}
    >
      <Typography level='h5'>时间: </Typography>
      <Input
        type='time'
        sx={{ width: '150px' }}
        defaultValue={moment(frequencyMetadata?.time).format('HH:mm')}
        onChange={e => {
          onFrequencyMetadataUpdate({
            ...frequencyMetadata,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            time: moment(
              moment(new Date()).format('YYYY-MM-DD') + 'T' + e.target.value,
            ).format(),
          })
        }}
      />
    </Grid>
  )

  switch (frequencyType) {
    case 'interval':
      return (
        <>
          <Grid item sm={12} sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography level='h5'>每隔: </Typography>
            <Input
              slotProps={{
                input: {
                  min: 1,
                  max: 1000,
                },
              }}
              type='number'
              value={frequency}
              onChange={e => {
                onFrequencyUpdate(e.target.value)
              }}
            />
            <Select
              placeholder='Unit'
              value={frequencyMetadata?.unit || 'days'}
              sx={{ ml: 1 }}
            >
              {['hours', 'days', 'weeks', 'months', 'years'].map(item => (
                <Option
                  key={item}
                  value={item}
                  onClick={() => {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      unit: item,
                    })
                  }}
                >
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Option>
              ))}
            </Select>
          </Grid>
          {timePickerComponent}
        </>
      )
    case 'days_of_the_week':
      return (
        <>
          <Grid item sm={12} sx={{ display: 'flex', alignItems: 'center' }}>
            <Card>
              <List
                orientation='horizontal'
                wrap
                sx={{
                  '--List-gap': '8px',
                  '--ListItem-radius': '20px',
                }}
              >
                {DAYS.map(item => (
                  <ListItem key={item}>
                    <Checkbox
                      checked={frequencyMetadata?.days?.includes(item) || false}
                      onClick={() => {
                        const newDaysOfTheWeek = frequencyMetadata['days'] || []
                        if (newDaysOfTheWeek.includes(item)) {
                          newDaysOfTheWeek.splice(
                            newDaysOfTheWeek.indexOf(item),
                            1,
                          )
                        } else {
                          newDaysOfTheWeek.push(item)
                        }

                        onFrequencyMetadataUpdate({
                          ...frequencyMetadata,
                          days: newDaysOfTheWeek.sort(),
                        })
                      }}
                      overlay
                      disableIcon
                      variant='soft'
                      label={item.charAt(0).toUpperCase() + item.slice(1)}
                    />
                  </ListItem>
                ))}
              </List>
              <Button
                size='sm'
                variant='soft'
                color='neutral'
                checked={frequencyMetadata?.days?.length === 7}
                onClick={() => {
                  if (frequencyMetadata?.days?.length === 7) {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      days: [],
                      weekPattern: 'every_week',
                      occurrences: [],
                    })
                  } else {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      days: DAYS.map(item => item),
                    })
                  }
                }}
                overlay
                disableIcon
              >
                {frequencyMetadata?.days?.length === 7
                  ? '取消全选'
                  : '全选'}
              </Button>
            </Card>
          </Grid>

          <Grid item sm={12} sx={{ display: 'flex', alignItems: 'center' }}>
            <Box>
              <RadioGroup
                value={frequencyMetadata?.weekPattern || 'every_week'}
                onChange={event => {
                  const newPattern = event.target.value
                  onFrequencyMetadataUpdate({
                    ...frequencyMetadata,
                    weekPattern: newPattern,
                    occurrences:
                      newPattern === 'every_week'
                        ? []
                        : frequencyMetadata?.occurrences || [],
                  })
                }}
                sx={{ gap: 1, '& > div': { p: 1 } }}
              >
                {Object.entries(WEEK_PATTERNS).map(([value, label]) => (
                  <FormControl key={value}>
                    <Radio value={value} label={label} variant='soft' />
                    {value === 'every_week' && (
                      <FormHelperText>
                        任务在选定的日期每周重复
                      </FormHelperText>
                    )}
                    {value === 'nth_day_of_month' && (
                      <FormHelperText>
                        任务在每月的特定日期重复（例如，第一个周一，第三个周五）
                      </FormHelperText>
                    )}
                  </FormControl>
                ))}
              </RadioGroup>

              {frequencyMetadata?.weekPattern === 'nth_day_of_month' && (
                <Box mt={2}>
                  <Typography level='body-sm' mb={1}>
                    选择选定日期的哪一次:
                  </Typography>
                  <Typography level='body-xs' color='neutral' mb={2}>
                    例如: "第1个周一"表示每个月的第一个周一
                  </Typography>
                  <Card>
                    <List
                      orientation='horizontal'
                      wrap
                      sx={{
                        '--List-gap': '8px',
                        '--ListItem-radius': '20px',
                      }}
                    >
                      {DAY_OCCURRENCE_OPTIONS.map(option => (
                        <ListItem key={option.value}>
                          <Checkbox
                            checked={
                              frequencyMetadata?.occurrences?.includes(
                                option.value,
                              ) || false
                            }
                            onChange={() => {
                              const currentOccurrences =
                                frequencyMetadata?.occurrences || []
                              const newOccurrences =
                                currentOccurrences.includes(option.value)
                                  ? currentOccurrences.filter(
                                      w => w !== option.value,
                                    )
                                  : [...currentOccurrences, option.value]
                              onFrequencyMetadataUpdate({
                                ...frequencyMetadata,
                                occurrences: newOccurrences.sort((a, b) => {
                                  if (a === -1) return 1 // Last occurrence goes to end
                                  if (b === -1) return -1
                                  return a - b
                                }),
                              })
                            }}
                            overlay
                            disableIcon
                            variant='soft'
                            label={option.label}
                          />
                        </ListItem>
                      ))}
                    </List>
                    <Button
                      size='sm'
                      variant='soft'
                      color='neutral'
                      onClick={() => {
                        if (
                          frequencyMetadata?.occurrences?.length ===
                          DAY_OCCURRENCE_OPTIONS.length
                        ) {
                          onFrequencyMetadataUpdate({
                            ...frequencyMetadata,
                            occurrences: [],
                          })
                        } else {
                          onFrequencyMetadataUpdate({
                            ...frequencyMetadata,
                            occurrences: DAY_OCCURRENCE_OPTIONS.map(
                              option => option.value,
                            ),
                          })
                        }
                      }}
                      overlay
                      disableIcon
                    >
                      {frequencyMetadata?.occurrences?.length ===
                      DAY_OCCURRENCE_OPTIONS.length
                        ? '取消全选'
                        : '全选'}
                    </Button>
                  </Card>
                </Box>
              )}

              {/* Quarter week pattern removed - doesn't make sense with Nth day approach */}

              {/* Live Preview */}
              {frequencyMetadata?.days?.length > 0 && (
                <Card mt={2} p={2}>
                  <Typography level='body-sm' color='primary'>
                    {generateSchedulePreview(frequencyMetadata)}
                  </Typography>
                </Card>
              )}
            </Box>
          </Grid>

          {timePickerComponent}
        </>
      )
    case 'day_of_the_month':
      return (
        <>
          <Grid
            item
            sm={12}
            sx={{
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Card>
              <List
                orientation='horizontal'
                wrap
                sx={{
                  '--List-gap': '8px',
                  '--ListItem-radius': '20px',
                }}
              >
                {MONTHS.map(item => (
                  <ListItem key={item}>
                    <Checkbox
                      checked={frequencyMetadata?.months?.includes(item)}
                      onClick={() => {
                        const newMonthsOfTheYear =
                          frequencyMetadata['months'] || []
                        if (newMonthsOfTheYear.includes(item)) {
                          newMonthsOfTheYear.splice(
                            newMonthsOfTheYear.indexOf(item),
                            1,
                          )
                        } else {
                          newMonthsOfTheYear.push(item)
                        }

                        onFrequencyMetadataUpdate({
                          ...frequencyMetadata,
                          months: newMonthsOfTheYear.sort(),
                        })
                        console.log('newMonthsOfTheYear', newMonthsOfTheYear)
                        // setDaysOfTheWeek(newDaysOfTheWeek)
                      }}
                      overlay
                      disableIcon
                      variant='soft'
                      label={item.charAt(0).toUpperCase() + item.slice(1)}
                    />
                  </ListItem>
                ))}
              </List>
              <Button
                size='sm'
                variant='soft'
                color='neutral'
                checked={frequencyMetadata?.months?.length === 12}
                onClick={() => {
                  if (frequencyMetadata?.months?.length === 12) {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      months: [],
                    })
                  } else {
                    onFrequencyMetadataUpdate({
                      ...frequencyMetadata,
                      months: MONTHS.map(item => item),
                    })
                  }
                }}
                overlay
                disableIcon
              >
                {frequencyMetadata?.months?.length === 12
                  ? '取消全选'
                  : '全选'}
              </Button>
            </Card>
          </Grid>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 1.5,
            }}
          >
            <Typography>在上述月份的第 </Typography>
            <Input
              sx={{ width: '80px' }}
              type='number'
              value={frequency}
              onChange={e => {
                if (e.target.value < 1) {
                  e.target.value = 1
                } else if (e.target.value > 31) {
                  e.target.value = 31
                }
                // setDayOftheMonth(e.target.value)

                onFrequencyUpdate(e.target.value)
              }}
            />
            <Typography>天</Typography>
          </Box>
          {timePickerComponent}
        </>
      )

    default:
      return <></>
  }
}

const RepeatSection = ({
  frequencyType,
  frequency,
  onFrequencyUpdate,
  onFrequencyTypeUpdate,
  frequencyMetadata,
  onFrequencyMetadataUpdate,
  frequencyError,
  allUserThings,
  onTriggerUpdate,
  OnTriggerValidate,
  isAttemptToSave,
  selectedThing,
}) => {
  const { data: userProfile } = useUserProfile()

  return (
    <Box mt={2}>
      <Typography level='h4'>重复:</Typography>
      <FormControl sx={{ mt: 1 }}>
        <Checkbox
          onChange={e => {
            onFrequencyTypeUpdate(e.target.checked ? 'daily' : 'once')
            if (e.target.checked) {
              onTriggerUpdate(null)
            }
          }}
          defaultChecked={!['once', 'trigger'].includes(frequencyType)}
          checked={!['once', 'trigger'].includes(frequencyType)}
          value={!['once', 'trigger'].includes(frequencyType)}
          overlay
          label='重复此任务'
        />
        <FormHelperText>
          这是需要定期完成的任务吗？
        </FormHelperText>
      </FormControl>
      {!['once', 'trigger'].includes(frequencyType) && (
        <>
          <Card sx={{ mt: 1 }}>
            <Typography level='h5'>应该多久重复一次？</Typography>

            <List
              orientation='horizontal'
              wrap
              sx={{
                '--List-gap': '8px',
                '--ListItem-radius': '20px',
              }}
            >
              {FREQUENCY_TYPES_RADIOS.map(item => (
                <ListItem key={item}>
                  <Checkbox
                    // disabled={index === 0}
                    checked={
                      item === frequencyType ||
                      (item === 'custom' &&
                        REPEAT_ON_TYPE.includes(frequencyType))
                    }
                    // defaultChecked={item === frequencyType}
                    onClick={() => {
                      if (item === 'custom') {
                        onFrequencyTypeUpdate(REPEAT_ON_TYPE[0])
                        onFrequencyUpdate(1)
                        onFrequencyMetadataUpdate({
                          unit: 'days',
                          time: frequencyMetadata?.time
                            ? frequencyMetadata?.time
                            : moment(
                                moment(new Date()).format('YYYY-MM-DD') +
                                  'T' +
                                  '18:00',
                              ).format(),
                          timezone:
                            Intl.DateTimeFormat().resolvedOptions().timeZone,
                        })

                        return
                      }
                      onFrequencyTypeUpdate(item)
                    }}
                    overlay
                    disableIcon
                    variant='soft'
                    label={
                      item.charAt(0).toUpperCase() +
                      item.slice(1).replace('_', ' ')
                    }
                  />
                </ListItem>
              ))}
            </List>
            <Typography>{FREQUENCY_TYPE_MESSAGE[frequencyType]}</Typography>
            {frequencyType === 'custom' ||
              (REPEAT_ON_TYPE.includes(frequencyType) && (
                <>
                  <Grid container spacing={1} mt={2}>
                    <Grid item>
                      <Typography>重复于:</Typography>
                      <Box
                        sx={{ display: 'flex', alignItems: 'center', gap: 2 }}
                      >
                        <RadioGroup
                          orientation='horizontal'
                          aria-labelledby='segmented-controls-example'
                          name='justify'
                          // value={justify}
                          // onChange={event => setJustify(event.target.value)}
                          sx={{
                            minHeight: 48,
                            padding: '4px',
                            borderRadius: '12px',
                            bgcolor: 'neutral.softBg',
                            '--RadioGroup-gap': '4px',
                            '--Radio-actionRadius': '8px',
                            mb: 1,
                          }}
                        >
                          {REPEAT_ON_TYPE.map(item => (
                            <Radio
                              key={item}
                              color='neutral'
                              checked={item === frequencyType}
                              onClick={() => {
                                if (
                                  item === 'day_of_the_month' ||
                                  item === 'interval'
                                ) {
                                  onFrequencyUpdate(1)
                                }
                                onFrequencyTypeUpdate(item)
                                if (item === 'days_of_the_week') {
                                  onFrequencyMetadataUpdate({
                                    ...frequencyMetadata,
                                    days: [],
                                    weekPattern: 'every_week',
                                    weekNumbers: [],
                                  })
                                } else if (item === 'day_of_the_month') {
                                  onFrequencyMetadataUpdate({
                                    ...frequencyMetadata,
                                    months: [],
                                  })
                                } else if (item === 'interval') {
                                  onFrequencyMetadataUpdate({
                                    ...frequencyMetadata,
                                    unit: 'days',
                                  })
                                }
                                // setRepeatOn(item)
                              }}
                              value={item}
                              disableIcon
                              label={item
                                .split('_')
                                .map((i, idx) => {
                                  // first or last word
                                  if (
                                    idx === 0 ||
                                    idx === item.split('_').length - 1
                                  ) {
                                    return (
                                      i.charAt(0).toUpperCase() + i.slice(1)
                                    )
                                  }
                                  return i
                                })
                                .join(' ')}
                              variant='plain'
                              sx={{
                                px: 2,
                                alignItems: 'center',
                              }}
                              slotProps={{
                                action: ({ checked }) => ({
                                  sx: {
                                    ...(checked && {
                                      bgcolor: 'background.surface',
                                      boxShadow: 'sm',
                                      '&:hover': {
                                        bgcolor: 'background.surface',
                                      },
                                    }),
                                  },
                                }),
                              }}
                            />
                          ))}
                        </RadioGroup>
                      </Box>
                    </Grid>

                    <RepeatOnSections
                      frequency={frequency}
                      onFrequencyUpdate={onFrequencyUpdate}
                      frequencyType={frequencyType}
                      onFrequencyTypeUpdate={onFrequencyTypeUpdate}
                      frequencyMetadata={frequencyMetadata || {}}
                      onFrequencyMetadataUpdate={onFrequencyMetadataUpdate}
                      things={allUserThings}
                    />
                  </Grid>
                </>
              ))}
            <FormControl error={Boolean(frequencyError)}>
              <FormHelperText error>{frequencyError}</FormHelperText>
            </FormControl>
          </Card>
        </>
      )}
      <FormControl sx={{ mt: 1 }}>
        <Checkbox
          onChange={e => {
            onFrequencyTypeUpdate(e.target.checked ? 'trigger' : 'once')
            //  if unchecked, set selectedThing to null:
            if (!e.target.checked) {
              onTriggerUpdate(null)
            }
          }}
          defaultChecked={frequencyType === 'trigger'}
          checked={frequencyType === 'trigger'}
          value={frequencyType === 'trigger'}
          disabled={!isPlusAccount(userProfile)}
          overlay
          label='根据设备状态触发此任务'
        />
        <FormHelperText
          sx={{
            opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
          }}
        >
          这是当设备状态改变时应该完成的任务吗？{userProfile && !isPlusAccount(userProfile) && (
            <Chip variant='soft' color='warning'>
              Plus功能
            </Chip>
          )}
        </FormHelperText>
        {!isPlusAccount(userProfile) && (
          <Typography level='body-sm' color='warning' sx={{ mt: 1 }}>
            基础套餐不提供基于设备的触发功能。升级到Plus套餐以在设备状态改变时自动触发任务。
          </Typography>
        )}
      </FormControl>
      {frequencyType === 'trigger' && (
        <ThingTriggerSection
          things={allUserThings}
          onTriggerUpdate={onTriggerUpdate}
          onValidate={OnTriggerValidate}
          isAttemptToSave={isAttemptToSave}
          selected={selectedThing}
        />
      )}
    </Box>
  )
}

export default RepeatSection
