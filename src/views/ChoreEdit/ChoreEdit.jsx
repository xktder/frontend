import { Add, HorizontalRule, Save } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  Input,
  List,
  ListItem,
  MenuItem,
  Option,
  Radio,
  RadioGroup,
  Select,
  Sheet,
  Switch,
  Typography,
} from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import NotificationTemplate from '../../components/NotificationTemplate.jsx'
import {
  useArchiveChore,
  useChore,
  useCreateChore,
  useDeleteChores,
  useUnArchiveChore,
  useUpdateChore,
} from '../../queries/ChoreQueries.jsx'
import { useCircleMembers, useUserProfile } from '../../queries/UserQueries.jsx'
import { useNotification } from '../../service/NotificationProvider'
import { getTextColorFromBackgroundColor } from '../../utils/Colors.jsx'
import { GetAllCircleMembers, GetThings } from '../../utils/Fetcher'
import { isPlusAccount } from '../../utils/Helpers'
import Priorities from '../../utils/Priorities.jsx'
import { getSafeBottomPadding } from '../../utils/SafeAreaUtils.js'
import LoadingComponent from '../components/Loading.jsx'
import RichTextEditor from '../components/RichTextEditor.jsx'
import SubTasks from '../components/SubTask.jsx'
import { useLabels } from '../Labels/LabelQueries'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import LabelModal from '../Modals/Inputs/LabelModal'
import RepeatSection from './RepeatSection'

const ASSIGN_STRATEGIES = [
  'random',
  'least_assigned',
  'least_completed',
  'keep_last_assigned',
  'random_except_last_assigned',
  'round_robin',
  'no_assignee',
]
const REPEAT_ON_TYPE = ['interval', 'days_of_the_week', 'day_of_the_month']

const NO_DUE_DATE_REQUIRED_TYPE = ['no_repeat', 'once']
const NO_DUE_DATE_ALLOWED_TYPE = ['trigger']
const ChoreEdit = () => {
  const { data: userProfile, isLoading: isUserProfileLoading } =
    useUserProfile()

  const [chore, setChore] = useState([])
  const [choresHistory, setChoresHistory] = useState([])
  const [userHistory, setUserHistory] = useState({})
  const { choreId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [confirmModelConfig, setConfirmModelConfig] = useState({})
  const [assignees, setAssignees] = useState([])
  const [performers, setPerformers] = useState([])
  const [assignStrategy, setAssignStrategy] = useState(ASSIGN_STRATEGIES[2])
  const [dueDate, setDueDate] = useState(null)
  const [assignedTo, setAssignedTo] = useState(-1)
  const [frequencyType, setFrequencyType] = useState('once')
  const [frequency, setFrequency] = useState(1)
  const [frequencyMetadata, setFrequencyMetadata] = useState({})
  const [labels, setLabels] = useState([])
  const [labelsV2, setLabelsV2] = useState([])
  const [priority, setPriority] = useState(0)
  const [points, setPoints] = useState(-1)
  const [requireApproval, setRequireApproval] = useState(false)
  const [isPrivate, setIsPrivate] = useState(false)
  const [subTasks, setSubTasks] = useState(null)
  const [completionWindow, setCompletionWindow] = useState(-1)
  const [allUserThings, setAllUserThings] = useState([])
  const [thingTrigger, setThingTrigger] = useState(null)
  const [isThingValid, setIsThingValid] = useState(false)

  const [notificationMetadata, setNotificationMetadata] = useState({})

  const [isRolling, setIsRolling] = useState(false)
  const [isNotificable, setIsNotificable] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [updatedBy, setUpdatedBy] = useState(0)
  const [createdBy, setCreatedBy] = useState(0)
  const [errors, setErrors] = useState({})
  const [attemptToSave, setAttemptToSave] = useState(false)
  const [addLabelModalOpen, setAddLabelModalOpen] = useState(false)
  const [showSavePrivacyDefault, setShowSavePrivacyDefault] = useState(false)
  const [privacySaved, setPrivacySaved] = useState(false)
  const [showSaveNotificationDefault, setShowSaveNotificationDefault] =
    useState(false)
  const [showSaveAssigneeDefault, setShowSaveAssigneeDefault] = useState(false)

  const { data: userLabelsRaw, isLoading: isUserLabelsLoading } = useLabels()
  const updateChoreMutation = useUpdateChore()
  const createChoreMutation = useCreateChore()
  const archiveChore = useArchiveChore()
  const unarchiveChore = useUnArchiveChore()
  const deleteChores = useDeleteChores()
  const {
    data: choreData,
    isLoading: isChoreLoading,
    refetch: refetchChore,
  } = useChore(choreId)
  const { data: membersData, isLoading: isMemberDataLoading } =
    useCircleMembers()
  const { showSuccess, showError } = useNotification()

  const [userLabels, setUserLabels] = useState([])

  useEffect(() => {
    if (userLabelsRaw) {
      setUserLabels(userLabelsRaw)
    }
  }, [userLabelsRaw])

  const Navigate = useNavigate()

  const HandleValidateChore = () => {
    const errors = {}

    if (name.trim() === '') {
      errors.name = 'Name is required'
    }
    if (assignStrategy !== 'no_assignee') {
      if (assignees.length === 0) {
        errors.assignees = 'At least 1 assignees is required'
      }
      if (assignedTo === null || assignedTo < 0) {
        errors.assignedTo = 'Assigned to is required'
      }
    }
    if (frequencyType === 'interval' && !frequency > 0) {
      errors.frequency = `Invalid frequency, the ${frequencyMetadata.unit} should be > 0`
    }
    if (
      frequencyType === 'days_of_the_week' &&
      frequencyMetadata['days']?.length === 0
    ) {
      errors.frequency = 'Please select at least one day of the week'
    }

    // Validate advanced scheduling patterns
    if (
      frequencyType === 'days_of_the_week' &&
      frequencyMetadata?.weekPattern === 'nth_day_of_month' &&
      (!frequencyMetadata?.occurrences ||
        frequencyMetadata.occurrences.length === 0)
    ) {
      errors.frequency =
        'Please select at least one day occurrence for the month'
    }
    if (
      frequencyType === 'day_of_the_month' &&
      frequencyMetadata['months']?.length === 0
    ) {
      errors.frequency = 'Please select at least one month'
    }
    if (
      dueDate === null &&
      !NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) &&
      !NO_DUE_DATE_ALLOWED_TYPE.includes(frequencyType)
    ) {
      if (REPEAT_ON_TYPE.includes(frequencyType)) {
        console.log('VALIDATION:', dueDate, frequencyType)

        errors.dueDate = 'Start date is required'
      } else {
        errors.dueDate = 'Due date is required'
      }
    }
    if (frequencyType === 'trigger') {
      if (!isThingValid) {
        errors.thingTrigger = 'Thing trigger is invalid'
      }
    }

    // if there is any error then return false:
    setErrors(errors)
    if (Object.keys(errors).length > 0) {
      // generate a list with error and set it in snackbar:

      const errorList = Object.keys(errors).map(key => (
        <ListItem key={key}>{errors[key]}</ListItem>
      ))
      showError({
        title: 'Please resolve the following errors:',
        message: <List>{errorList}</List>,
      })
      return false
    }

    return true
  }

  const handleDueDateChange = e => {
    setDueDate(e.target.value)
  }
  const HandleSaveChore = () => {
    setAttemptToSave(true)
    if (!HandleValidateChore()) {
      console.log('validation failed')
      console.log(errors)
      return
    }
    let newChoreId = choreId
    if (searchParams.get('clone') === 'true') {
      newChoreId = null
    }
    const chore = {
      id: Number(newChoreId),
      name: name,
      description: description,
      assignees: assignees,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      frequencyType: frequencyType,
      frequency: Number(frequency),
      frequencyMetadata: frequencyMetadata,
      assignedTo: assignStrategy === 'no_assignee' ? null : assignedTo,
      assignStrategy: assignStrategy,
      isRolling: isRolling,
      isActive: isActive,
      notification: isNotificable,
      labels: labels.map(l => l.name),
      labelsV2: labelsV2,
      subTasks: subTasks,
      notificationMetadata: notificationMetadata,
      thingTrigger: thingTrigger,
      points: points < 0 ? null : points,
      requireApproval: requireApproval,
      isPrivate: isPrivate,
      completionWindow:
        // if completionWindow is -1 then set it to null or dueDate is null
        completionWindow < 0 || dueDate === null ? null : completionWindow,
      priority: priority,
    }
    let SaveFunction = createChoreMutation.mutateAsync
    if (newChoreId > 0) {
      SaveFunction = updateChoreMutation.mutateAsync
    }

    SaveFunction(chore)
      .then(() => {
        showSuccess({
          title: 'Chore Saved',
          message: 'Your task has been saved successfully!',
        })
        Navigate('/chores')
      })
      .catch(error => {
        console.error('Failed to save chore:', error)
        showError({
          title: 'Save Failed',
          message: 'Failed to save chore, please try again.',
        })
      })
  }
  useEffect(() => {
    //fetch performers:
    GetAllCircleMembers().then(data => {
      setPerformers(data.res)
    })
    GetThings().then(response => {
      response.json().then(data => {
        setAllUserThings(data.res)
      })
    })

    // Load default privacy setting for new chores
    if (!choreId) {
      const defaultPrivacySetting = localStorage.getItem(
        'defaultPrivacySetting',
      )
      if (defaultPrivacySetting !== null) {
        setIsPrivate(JSON.parse(defaultPrivacySetting))
      }

      const defaultNotificationSetting = localStorage.getItem(
        'defaultNotificationSetting',
      )
      if (defaultNotificationSetting !== null) {
        setIsNotificable(JSON.parse(defaultNotificationSetting))
      }

      const defaultAssigneeSetting = localStorage.getItem(
        'defaultAssigneeSetting',
      )
      if (defaultAssigneeSetting !== null) {
        const savedAssignees = JSON.parse(defaultAssigneeSetting)
        setAssignees(savedAssignees)
      }
    }
  }, [])
  useEffect(() => {
    if (isChoreLoading === false && choreData && choreId) {
      const data = choreData
      const isCloneMode = searchParams.get('clone') === 'true'

      setChore(data.res)
      setName(data.res.name ? data.res.name : '')
      setDescription(data.res.description ? data.res.description : '')
      setAssignees(data.res.assignees ? data.res.assignees : [])
      setAssignedTo(data.res.assignedTo)
      setFrequencyType(data.res.frequencyType ? data.res.frequencyType : 'once')

      setFrequencyMetadata(data.res.frequencyMetadata)
      setFrequency(data.res.frequency)

      setNotificationMetadata(data.res.notificationMetadata)
      setPoints(data.res.points && data.res.points > -1 ? data.res.points : -1)
      setRequireApproval(data.res.requireApproval || false)
      setIsPrivate(data.res.isPrivate || false)
      setCompletionWindow(
        data.res.completionWindow && data.res.completionWindow > -1
          ? data.res.completionWindow
          : -1,
      )

      setLabelsV2(data.res.labelsV2)

      setPriority(data.res.priority)
      setAssignStrategy(
        data.res.assignStrategy
          ? data.res.assignStrategy
          : ASSIGN_STRATEGIES[2],
      )
      setIsRolling(data.res.isRolling)
      setIsActive(data.res.isActive)
      setSubTasks(data.res.subTasks ? data.res.subTasks : [])

      if (isCloneMode) {
        if (data.res.subTasks) {
          const clonedSubTasks = data.res.subTasks.map(subTask => ({
            ...subTask,
            id: -subTask.id, // Negate ID to indicate new sub task
            parentId: subTask.parentId ? -subTask.parentId : null, // Negate parent ID if exists
            completed: false, // Reset completion status
            completedAt: null, // Reset completion date
          }))
          setSubTasks(clonedSubTasks)
        }
        if (data.res.name) {
          setName(`Copy of ${data.res.name}`)
        }
      }

      setIsNotificable(data.res.notification)
      setThingTrigger(data.res.thingChore)
      setDueDate(
        data.res.nextDueDate
          ? moment(data.res.nextDueDate).format('YYYY-MM-DDTHH:mm:00')
          : null,
      )
      setCreatedBy(data.res.createdBy)
      setUpdatedBy(data.res.updatedBy)
    }
  }, [choreData, isChoreLoading, searchParams])

  // useEffect(() => {
  //   if (userLabels && userLabels.length == 0 && labelsV2.length == 0) {
  //     return
  //   }
  //   const labelIds = labelsV2.map(l => l.id)
  //   setLabelsV2(userLabels.filter(l => labelIds.indexOf(l.id) > -1))
  // }, [userLabels, labelsV2])

  useEffect(() => {
    // if frequency type change to somthing need a due date then set it to the current date:
    if (!NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) && !dueDate) {
      setDueDate(moment(new Date()).format('YYYY-MM-DDTHH:mm:00'))
    }
    if (NO_DUE_DATE_ALLOWED_TYPE.includes(frequencyType)) {
      setDueDate(null)
    }
  }, [frequencyType])

  useEffect(() => {
    if (assignees.length === 0) {
      setAssignStrategy('no_assignee')
      setAssignedTo(null)
    } else if (assignees.length === 1) {
      setAssignedTo(assignees[0].userId)
      if (assignStrategy === 'no_assignee') {
        setAssignStrategy(ASSIGN_STRATEGIES[2]) // default to least_completed
      }
    }
  }, [assignees, assignStrategy])

  // useEffect(() => {
  //   if (performers.length > 0 && assignees.length === 0 && userProfile) {
  //     setAssignees([
  //       {
  //         userId: userProfile?.id,
  //       },
  //     ])
  //   }
  // }, [performers, userProfile])

  // if user resolve the error trigger validation to remove the error message from the respective field
  useEffect(() => {
    if (attemptToSave) {
      HandleValidateChore()
    }
  }, [assignees, name, frequencyMetadata, attemptToSave, dueDate])

  const handleDelete = () => {
    setConfirmModelConfig({
      isOpen: true,
      title: 'Delete Chore',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      message: 'Are you sure you want to delete this chore?',
      onClose: isConfirmed => {
        if (isConfirmed === true) {
          deleteChores.mutate([choreId], {
            onSuccess: () => {
              Navigate('/chores')
            },
            onError: error => {
              showError({
                title: 'Delete Failed',
                message: `Failed to delete chore: ${error.message}`,
              })
            },
          })
        }
        setConfirmModelConfig({})
      },
    })
  }
  if (
    (isChoreLoading && choreId) ||
    isUserLabelsLoading ||
    isUserProfileLoading ||
    isMemberDataLoading
  ) {
    return <LoadingComponent />
  }
  return (
    <Container maxWidth='md'>
      {/* Section 1: Basic Information */}
      <Box mb={4}>
        {/* <Typography
          level='h4'
          mb={2}
          sx={{ borderBottom: '2px solid', borderColor: 'primary.main', pb: 1 }}
        >
          Basic Information
        </Typography> */}

        <Box mb={3}>
          <FormControl error={errors.name}>
            <Typography level='h4'>任务名称</Typography>
            <Typography level='body-md'>
              这个任务的名称是什么？
            </Typography>
            <Input value={name} onChange={e => setName(e.target.value)} />
            <FormHelperText error>{errors.name}</FormHelperText>
          </FormControl>
        </Box>

        <Box mb={3}>
          <FormControl error={errors.description}>
            <Typography level='h4'>任务描述</Typography>
            <Typography level='body-md'>这个任务是关于什么的？</Typography>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              entityId={choreId}
              entityType={'chore_description'}
            />
            <FormHelperText error>{errors.description}</FormHelperText>
          </FormControl>
        </Box>

        <Box mb={3}>
          <Typography level='h4'>优先级</Typography>
          <Typography level='body-md'>这个任务有多重要？</Typography>

          {/* Priority Chip Selection */}
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              mt: 2,
            }}
          >
            {/* Priority Chips P1-P4 */}
            {Priorities.map(priorityItem => (
              <Chip
                key={priorityItem.value}
                variant={priority === priorityItem.value ? 'solid' : 'outlined'}
                color={
                  priority === priorityItem.value
                    ? priorityItem.color || 'primary'
                    : 'neutral'
                }
                size='lg'
                onClick={() => setPriority(priorityItem.value)}
                startDecorator={priorityItem.icon}
                sx={{
                  fontWeight: 'md',
                  cursor: 'pointer',
                  minHeight: 34,
                }}
              >
                {priorityItem.name}
              </Chip>
            ))}
            {/* No Priority Chip */}
            <Chip
              variant={priority === 0 ? 'solid' : 'outlined'}
              color='neutral'
              size='lg'
              onClick={() => setPriority(0)}
              startDecorator={<HorizontalRule />}
              sx={{
                fontWeight: 'md',
                cursor: 'pointer',
                minHeight: 34,
              }}
            >
              No Priority
            </Chip>
          </Box>
        </Box>

        <Box mb={3}>
          <Typography level='h4'>标签</Typography>
          <Typography level='body-md'>
            关于这个任务需要记住的事项或标记
          </Typography>
          <Select
            multiple
            onChange={(event, newValue) => {
              setLabelsV2(userLabels.filter(l => newValue.indexOf(l.name) > -1))
            }}
            value={labelsV2?.map(l => l.name)}
            renderValue={selected => (
              <Box sx={{ display: 'flex', gap: '0.25rem' }}>
                {labelsV2.map(selectedOption => {
                  return (
                    <Chip
                      variant='soft'
                      color='primary'
                      key={selectedOption.id}
                      size='lg'
                      sx={{
                        background: selectedOption.color,
                        color: getTextColorFromBackgroundColor(
                          selectedOption.color,
                        ),
                      }}
                    >
                      {selectedOption.name}
                    </Chip>
                  )
                })}
              </Box>
            )}
            sx={{ minWidth: '15rem' }}
            slotProps={{
              listbox: {
                sx: {
                  width: '100%',
                },
              },
            }}
          >
            {userLabels &&
              userLabels.map(label => (
                <Option key={label.id + label.name} value={label.name}>
                  <div
                    style={{
                      width: '20 px',
                      height: '20 px',
                      borderRadius: '50%',
                      background: label.color,
                    }}
                  />
                  {label.name}
                </Option>
              ))}
            <MenuItem
              key={'addNewLabel'}
              value={' New Label'}
              onClick={() => {
                setAddLabelModalOpen(true)
              }}
            >
              <Add />
              Add New Label
            </MenuItem>
          </Select>
        </Box>

        <Box>
          <Typography level='h4'>子任务</Typography>
          {/* <FormControl sx={{ mt: 1 }}>
            <Checkbox
              onChange={e => {
                if (e.target.checked) {
                  setSubTasks([])
                } else {
                  setSubTasks(null)
                }
              }}
              overlay
              checked={subTasks != null}
              label='Add sub tasks to this task'
            />
            <FormHelperText>Break this task into smaller steps</FormHelperText>
          </FormControl> */}
          <Card
            variant='outlined'
            sx={{
              p: 1,
              mt: 2,
            }}
          >
            <SubTasks
              editMode={true}
              tasks={subTasks ? subTasks : []}
              setTasks={setSubTasks}
              choreId={choreId}
            />
          </Card>
        </Box>
      </Box>

      {/* Section 2: Assignment & Responsibility */}
      <Box mb={4}>
        <Box mb={3}>
          <Typography level='h4'>执行者</Typography>
          <Typography level='body-md'>谁可以执行这个任务？</Typography>
          <Card>
            <List
              orientation='horizontal'
              wrap
              sx={{
                '--List-gap': '8px',
                '--ListItem-radius': '20px',
              }}
            >
              {/* add one for Anyone if no specific assignee is selected */}

              <ListItem key={'anyone'}>
                <Checkbox
                  checked={assignees.length === 0}
                  onClick={() => {
                    setAssignees([])
                    setIsPrivate(false)
                  }}
                  overlay
                  disableIcon
                  variant='soft'
                  label='Anyone'
                />
              </ListItem>

              {performers?.map((item, index) => (
                <ListItem key={item.id}>
                  <Checkbox
                    checked={
                      assignees.find(a => a.userId == item.userId) != null
                    }
                    onClick={() => {
                      if (assignees.some(a => a.userId === item.userId)) {
                        const newAssignees = assignees.filter(
                          a => a.userId !== item.userId,
                        )
                        setAssignees(newAssignees)
                      } else {
                        setAssignees([...assignees, { userId: item.userId }])
                      }
                      setShowSaveAssigneeDefault(true)
                    }}
                    overlay
                    disableIcon
                    variant='soft'
                    label={item.displayName}
                  />
                </ListItem>
              ))}
            </List>
          </Card>
          <FormControl error={Boolean(errors.assignee)}>
            <FormHelperText error>{Boolean(errors.assignee)}</FormHelperText>
          </FormControl>

          {showSaveAssigneeDefault && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'start' }}>
              <Button
                variant='outlined'
                size='sm'
                color='neutral'
                startDecorator={<Save />}
                sx={{
                  borderRadius: 6,
                  fontWeight: 500,
                  '&:hover': {
                    background: 'neutral.softHoverBg',
                  },
                }}
                onClick={() => {
                  localStorage.setItem(
                    'defaultAssigneeSetting',
                    JSON.stringify(assignees),
                  )
                  setShowSaveAssigneeDefault(false)
                }}
              >
                记住用于未来任务
              </Button>
            </Box>
          )}
        </Box>

        {assignees.length > 1 && (
          <>
            <Box mb={3}>
              <Typography level='h4'>当前分配给</Typography>
              <Typography level='body-md'>
                下一个任务分配给谁？
              </Typography>
              <Select
                placeholder={
                  assignees.length === 0
                    ? 'No Assignees yet can perform this task'
                    : 'Select an assignee for this task'
                }
                disabled={assignees.length === 0}
                value={assignedTo > -1 ? assignedTo : null}
              >
                {performers
                  ?.filter(p => assignees.find(a => a.userId == p.userId))
                  .map((item, index) => (
                    <Option
                      value={item.userId}
                      key={item.displayName}
                      onClick={() => {
                        setAssignedTo(item.userId)
                      }}
                    >
                      {item.displayName}
                    </Option>
                  ))}
              </Select>
            </Box>

            <Box>
              <Typography level='h4'>分配策略</Typography>
              <Typography level='body-md'>
                如何为后续任务选择执行者？
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
                  {ASSIGN_STRATEGIES.map((item, idx) => (
                    <ListItem key={item}>
                      <Checkbox
                        checked={assignStrategy === item}
                        onClick={() => setAssignStrategy(item)}
                        overlay
                        disableIcon
                        variant='soft'
                        label={item
                          .split('_')
                          .map(x => x.charAt(0).toUpperCase() + x.slice(1))
                          .join(' ')}
                      />
                    </ListItem>
                  ))}
                </List>
              </Card>
            </Box>
          </>
        )}
      </Box>

      {/* Section 3: Schedule & Timing */}
      <Box mb={4}>
        <RepeatSection
          frequency={frequency}
          onFrequencyUpdate={setFrequency}
          frequencyType={frequencyType}
          onFrequencyTypeUpdate={setFrequencyType}
          frequencyMetadata={frequencyMetadata}
          onFrequencyMetadataUpdate={setFrequencyMetadata}
          frequencyError={errors?.frequency}
          allUserThings={allUserThings}
          onTriggerUpdate={thingUpdate => {
            if (thingUpdate === null) {
              setThingTrigger(null)
              return
            }
            setThingTrigger({
              triggerState: thingUpdate.triggerState,
              condition: thingUpdate.condition,
              thingID: thingUpdate.thing.id,
            })
          }}
          OnTriggerValidate={setIsThingValid}
          isAttemptToSave={attemptToSave}
          selectedThing={thingTrigger}
        />

        <Box mt={3} mb={3}>
          <Typography level='h4'>
            {REPEAT_ON_TYPE.includes(frequencyType) ? '开始日期' : '截止日期'}
          </Typography>
          {frequencyType === 'trigger' && !dueDate && (
            <Typography level='body-sm'>
              当触发条件满足时将设置截止日期
            </Typography>
          )}

          {NO_DUE_DATE_REQUIRED_TYPE.includes(frequencyType) && (
            <FormControl sx={{ mt: 1 }}>
              <Checkbox
                onChange={e => {
                  if (e.target.checked) {
                    setDueDate(moment(new Date()).format('YYYY-MM-DDTHH:mm:00'))
                  } else {
                    setDueDate(null)
                  }
                }}
                defaultChecked={dueDate !== null}
                checked={dueDate !== null}
                overlay
                label='为这个任务设置截止日期'
              />
              <FormHelperText>
                任务需要在特定时间前完成。
              </FormHelperText>
            </FormControl>
          )}
          {dueDate && (
            <FormControl error={Boolean(errors.dueDate)}>
              <Typography level='body-md'>
                {REPEAT_ON_TYPE.includes(frequencyType)
                  ? '这个任务何时开始？'
                  : '这个任务下一次截止时间是什么时候？'}
              </Typography>
              <Input
                type='datetime-local'
                value={dueDate}
                onChange={handleDueDateChange}
              />
              <FormHelperText>{errors.dueDate}</FormHelperText>
            </FormControl>
          )}
        </Box>

        {dueDate && (
          <Box mb={3}>
            <Typography level='h4'>完成时间窗口</Typography>
            <FormControl orientation='horizontal'>
              <Switch
                checked={completionWindow != -1}
                onClick={event => {
                  event.preventDefault()
                  if (completionWindow != -1) {
                    setCompletionWindow(-1)
                  } else {
                    setCompletionWindow(1)
                  }
                }}
                color={completionWindow !== -1 ? 'success' : 'neutral'}
                variant={completionWindow !== -1 ? 'solid' : 'outlined'}
                sx={{
                  mr: 2,
                }}
              />
              <div>
                <Typography level='body-md'>
                  完成时间窗口（小时）
                </Typography>
                <FormHelperText sx={{ mt: 0 }}>
                  设置任务在截止前不能被完成的时间窗口
                </FormHelperText>
              </div>
            </FormControl>
            {completionWindow != -1 && (
              <Card variant='outlined'>
                <Box
                  sx={{
                    mt: 0,
                    ml: 4,
                  }}
                >
                  <Typography level='body-sm'>小时:</Typography>
                  <Input
                    type='number'
                    value={completionWindow}
                    sx={{ maxWidth: 100 }}
                    slotProps={{
                      input: {
                        min: 0,
                        max: 24 * 7,
                      },
                    }}
                    placeholder='小时'
                    onChange={e => {
                      setCompletionWindow(parseInt(e.target.value))
                    }}
                  />
                </Box>
              </Card>
            )}
          </Box>
        )}

        {!['once', 'no_repeat'].includes(frequencyType) && (
          <Box>
            <Typography level='h4'>调度偏好</Typography>
            <Typography level='body-md'>
              如何重新安排下一个截止日期？
            </Typography>
            <RadioGroup name='tiers' sx={{ gap: 1, '& > div': { p: 1 } }}>
              <FormControl>
                <Radio
                  overlay
                  checked={!isRolling}
                  onClick={() => setIsRolling(false)}
                  label='从截止日期重新安排'
                />
                <FormHelperText>
                  下一个任务将从原始截止日期安排，即使前一个任务完成得较晚
                </FormHelperText>
              </FormControl>
              <FormControl>
                <Radio
                  overlay
                  checked={isRolling}
                  onClick={() => setIsRolling(true)}
                  label='从完成日期重新安排'
                />
                <FormHelperText>
                  下一个任务将从上一个任务的实际完成日期安排
                </FormHelperText>
              </FormControl>
            </RadioGroup>
          </Box>
        )}
        {/* Section 3.1: Notifications */}

        <Box mb={3}>
          <Typography level='h4'>通知</Typography>
          {!isPlusAccount(userProfile) && (
            <Typography level='body-sm' color='warning' sx={{ mb: 1 }}>
              基础套餐不提供任务通知功能。升级到Plus套餐以在任务截止或完成时接收提醒。
            </Typography>
          )}

          <FormControl sx={{ mt: 1 }}>
            <Checkbox
              onChange={e => {
                setIsNotificable(e.target.checked)
                if (!e.target.checked) {
                  setNotificationMetadata({})
                }
              }}
              defaultChecked={isNotificable}
              checked={isNotificable}
              disabled={!isPlusAccount(userProfile)}
              overlay
              label='为此任务启用通知'
            />
            <FormHelperText
              sx={{
                opacity: !isPlusAccount(userProfile) ? 0.5 : 1,
              }}
            >
              何时为此任务接收通知
            </FormHelperText>
          </FormControl>
        </Box>

        {isNotificable && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Card variant='outlined'>
              <Typography level='h4' mb={2}>
                通知时间安排
              </Typography>
              <Box sx={{ p: 0.5 }}>
                <NotificationTemplate
                  onChange={metadata => {
                    const newTemplates = metadata.notifications
                    if (notificationMetadata?.templates !== newTemplates) {
                      setNotificationMetadata({
                        ...notificationMetadata,
                        templates: newTemplates,
                      })
                    }
                  }}
                  value={notificationMetadata}
                />
              </Box>

              <Typography level='h4' mt={3} mb={2}>
                通知对象
              </Typography>
              <FormControl>
                <Checkbox
                  overlay
                  disabled={true}
                  checked={true}
                  label='所有执行者'
                />
                <FormHelperText>通知所有执行者</FormHelperText>
              </FormControl>

              <FormControl>
                <Checkbox
                  overlay
                  onClick={() => {
                    if (notificationMetadata?.circleGroup) {
                      delete notificationMetadata.circleGroupID
                    }

                    setNotificationMetadata({
                      ...notificationMetadata,
                      circleGroup: !notificationMetadata?.circleGroup,
                    })
                  }}
                  checked={
                    notificationMetadata
                      ? notificationMetadata?.circleGroup
                      : false
                  }
                  label='特定群组'
                />
                <FormHelperText>通知特定群组</FormHelperText>
              </FormControl>

              {notificationMetadata?.circleGroup && (
                <Box
                  sx={{
                    mt: 0,
                    ml: 4,
                  }}
                >
                  <Typography level='body-sm'>Telegram群组ID:</Typography>
                  <Input
                    type='number'
                    value={notificationMetadata?.circleGroupID}
                    placeholder='Telegram群组ID'
                    onChange={e => {
                      setNotificationMetadata({
                        ...notificationMetadata,
                        circleGroupID: parseInt(e.target.value),
                      })
                    }}
                  />
                </Box>
              )}
            </Card>
          </Box>
        )}
      </Box>

      {/* Section 4: Task Settings */}
      <Box mb={4}>
        <Typography
          level='h3'
          mb={2}
          sx={{
            borderColor: 'primary.main',
            pb: 1,
          }}
        >
          任务设置:
        </Typography>

        <Box mb={3}>
          <Typography level='h4'>积分系统</Typography>
          <FormControl sx={{ mt: 1 }}>
            <Checkbox
              onChange={e => {
                if (e.target.checked) {
                  setPoints(1)
                } else {
                  setPoints(-1)
                }
              }}
              checked={points > -1}
              overlay
              label='为完成任务分配积分'
            />
            <FormHelperText>
              为这个任务分配积分，用户完成时将获得积分
            </FormHelperText>
          </FormControl>
          {points != -1 && (
            <Card variant='outlined' sx={{ mt: 2 }}>
              <Box
                sx={{
                  mt: 0,
                  ml: 4,
                }}
              >
                <Typography level='body-sm'>积分:</Typography>
                <Input
                  type='number'
                  value={points}
                  sx={{ maxWidth: 100 }}
                  slotProps={{
                    input: {
                      min: 0,
                      max: 1000,
                    },
                  }}
                  placeholder='积分'
                  onChange={e => {
                    setPoints(parseInt(e.target.value))
                  }}
                />
              </Box>
            </Card>
          )}
        </Box>

        <Box mb={3}>
          <Typography level='h4'>审批要求</Typography>
          <FormControl sx={{ mt: 1 }}>
            <Checkbox
              onChange={e => {
                setRequireApproval(e.target.checked)
              }}
              checked={requireApproval}
              overlay
              label='需要管理员审批'
            />
            <FormHelperText>
              这个任务在标记为完成之前需要管理员审批
            </FormHelperText>
          </FormControl>
        </Box>

        <Box>
          <Typography level='h4'>隐私设置</Typography>
          <Typography level='body-md'>谁可以看到这个任务？</Typography>
          <RadioGroup
            name='isPrivate'
            value={isPrivate}
            onChange={event => {
              const newValue = event.target.value === 'true' ? true : false
              setIsPrivate(newValue)
              setShowSavePrivacyDefault(true)
            }}
            sx={{
              '& > div': { py: 1 },
            }}
          >
            <FormControl>
              <Radio overlay value={false} label='公开' />
              <FormHelperText>圈子中的每个人</FormHelperText>
            </FormControl>
            <FormControl>
              <Radio
                overlay
                disabled={assignees.length === 0}
                value={true}
                label='限制'
              />
              <FormHelperText>
                您和分配给任务的其他人
                {assignees.length === 0
                  ? '（未选择执行者，限制选项被禁用）'
                  : ''}
              </FormHelperText>
            </FormControl>
          </RadioGroup>

          {showSavePrivacyDefault && (
            <Box sx={{ mt: 0, display: 'flex', justifyContent: 'start' }}>
              <Button
                variant='outlined'
                size='sm'
                color='neutral'
                startDecorator={<Save />}
                sx={{
                  borderRadius: 6,
                  fontWeight: 500,
                  '&:hover': {
                    background: 'neutral.softHoverBg',
                  },
                }}
                onClick={() => {
                  localStorage.setItem(
                    'defaultPrivacySetting',
                    JSON.stringify(isPrivate),
                  )
                  setShowSavePrivacyDefault(false)
                }}
              >
                记住用于未来任务
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {choreId > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mt: 3 }}>
          <Sheet
            sx={{
              p: 2,
              borderRadius: 'md',
              boxShadow: 'sm',
            }}
          >
            <Typography level='body1'>
              由{' '}
              <Chip variant='solid'>
                {membersData.res.find(f => f.userId === createdBy)?.displayName}
              </Chip>{' '}
              创建于 {moment(chore.createdAt).fromNow()}
            </Typography>
            {(chore.updatedAt && updatedBy > 0 && (
              <>
                <Divider sx={{ my: 1 }} />

                <Typography level='body1'>
                  由{' '}
                  <Chip variant='solid'>
                    {
                      membersData.res.find(f => f.userId === updatedBy)
                        ?.displayName
                    }
                  </Chip>{' '}
                  更新于 {moment(chore.updatedAt).fromNow()}
                </Typography>
              </>
            )) || <></>}
          </Sheet>
        </Box>
      )}

      <Divider sx={{ mb: 9 }} />

      <Sheet
        variant='outlined'
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          paddingBottom: getSafeBottomPadding(2),
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 2,
          'z-index': 1000,
          bgcolor: 'background.body',
          boxShadow: 'md',
        }}
      >
        {choreId > 0 && (
          <>
            {isActive ? (
              <Button
                color='danger'
                variant='outlined'
                onClick={() => {
                  archiveChore.mutate(choreId)
                }}
              >
                归档
              </Button>
            ) : (
              <Button
                color='neutral'
                variant='outlined'
                onClick={() => {
                  unarchiveChore.mutate(choreId)
                }}
              >
                取消归档
              </Button>
            )}
            <Button
              color='danger'
              variant='solid'
              onClick={() => {
                handleDelete()
              }}
            >
              删除
            </Button>
          </>
        )}
        <Button
          color='neutral'
          variant='outlined'
          onClick={() => {
            window.history.back()
          }}
        >
          取消
        </Button>
        <Button color='primary' variant='solid' onClick={HandleSaveChore}>
          {choreId > 0 ? '保存' : '创建'}
        </Button>
      </Sheet>
      <ConfirmationModal config={confirmModelConfig} />
      {addLabelModalOpen && (
        <LabelModal
          isOpen={addLabelModalOpen}
          onSave={label => {
            console.log('label', label)

            const newLabels = [...labelsV2]
            newLabels.push(label)
            setUserLabels([...userLabels, label])

            setLabelsV2([...labelsV2, label])
            setAddLabelModalOpen(false)
          }}
          onClose={() => setAddLabelModalOpen(false)}
        />
      )}
      {/* <ChoreHistory ChoreHistory={choresHistory} UsersData={performers} /> */}
    </Container>
  )
}

export default ChoreEdit
