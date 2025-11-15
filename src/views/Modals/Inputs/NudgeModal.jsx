import {
  Alert,
  Box,
  Button,
  FormControl,
  FormLabel,
  Switch,
  Textarea,
  Typography,
} from '@mui/joy'
import { useCallback, useEffect, useState } from 'react'
import KeyboardShortcutHint from '../../../components/common/KeyboardShortcutHint'
import { useResponsiveModal } from '../../../hooks/useResponsiveModal'
import { isOfficialDonetickInstanceSync } from '../../../utils/FeatureToggle'

function NudgeModal({ config }) {
  const { ResponsiveModal } = useResponsiveModal()
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false)
  const [message, setMessage] = useState('')
  const [notifyAllAssignees, setNotifyAllAssignees] = useState(false)
  const [isOfficialInstance, setIsOfficialInstance] = useState(false)

  const handleAction = useCallback(
    isConfirmed => {
      if (isConfirmed) {
        config.onConfirm({
          choreId: config.choreId,
          message,
          notifyAllAssignees,
        })
      } else {
        config.onClose()
      }
    },
    [config, message, notifyAllAssignees],
  )

  // Reset form when modal opens
  useEffect(() => {
    if (config?.isOpen) {
      setMessage('')
      setNotifyAllAssignees(false)

      // Check if this is the official donetick.com instance
      try {
        setIsOfficialInstance(isOfficialDonetickInstanceSync())
      } catch (error) {
        console.warn('Error checking instance type:', error)
        setIsOfficialInstance(false)
      }
    }
  }, [config?.isOpen])

  // Keyboard shortcuts for nudge modal
  useEffect(() => {
    const handleKeyDown = event => {
      if (!config?.isOpen) return

      // Show keyboard shortcuts when Ctrl/Cmd is pressed
      if (event.ctrlKey || event.metaKey) {
        setShowKeyboardShortcuts(true)
      }

      // Ctrl/Cmd + Y for confirm
      if ((event.ctrlKey || event.metaKey) && event.key === 'y') {
        event.preventDefault()
        handleAction(true)
        return
      }

      // Ctrl/Cmd + X for cancel
      if ((event.ctrlKey || event.metaKey) && event.key === 'x') {
        event.preventDefault()
        handleAction(false)
        return
      }

      // Escape key for cancel
      if (event.key === 'Escape') {
        event.preventDefault()
        handleAction(false)
        return
      }
    }

    const handleKeyUp = event => {
      if (!event.ctrlKey && !event.metaKey) {
        setShowKeyboardShortcuts(false)
      }
    }

    if (config?.isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('keyup', handleKeyUp)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [config?.isOpen, handleAction])

  return (
    <ResponsiveModal
      open={config?.isOpen}
      onClose={config?.onClose}
      size='md'
      unmountDelay={250}
    >
      <Typography level='h4' mb={2}>
        发送提醒
      </Typography>

      <Typography level='body-md' mb={2}>
        向任务执行者发送温和的提醒。您可以自定义消息并选择通知对象。
      </Typography>

      {!isOfficialInstance && (
        <Alert color='warning' sx={{ mb: 2 }}>
          <Typography level='body-sm'>
            <strong>请注意！</strong>此功能在Donetick云服务上可用！由于您使用的是自托管实例，提醒功能需要您设置Google云账户和Firebase云消息(FCM)，并自行构建Android或iOS应用程序。
            <br />
            如果我们提出更简便的自托管配置方案，将会及时更新。
          </Typography>
        </Alert>
      )}

      <FormControl mb={2}>
        <FormLabel>自定义消息（可选）</FormLabel>
        <Textarea
          placeholder='添加您的个人提醒消息...'
          value={message}
          onChange={e => setMessage(e.target.value)}
          minRows={3}
          maxRows={5}
        />
      </FormControl>

      <FormControl orientation='horizontal' sx={{ mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <FormLabel>通知所有执行者</FormLabel>
          <Typography level='body-sm' color='text.secondary'>
            如果启用，所有可以查看此任务的成员都会收到通知。否则，只有指定的执行者会收到提醒。
          </Typography>
        </Box>
        <Switch
          checked={notifyAllAssignees}
          onChange={e => setNotifyAllAssignees(e.target.checked)}
        />
      </FormControl>

      <Box display={'flex'} justifyContent={'space-around'} gap={1}>
        <Button
          size='lg'
          onClick={() => handleAction(true)}
          disabled={!isOfficialInstance}
          fullWidth
          color='primary'
          endDecorator={
            <KeyboardShortcutHint shortcut='Y' show={showKeyboardShortcuts} />
          }
        >
          发送提醒
        </Button>

        <Button
          size='lg'
          onClick={() => handleAction(false)}
          variant='outlined'
          fullWidth
          endDecorator={
            <KeyboardShortcutHint shortcut='X' show={showKeyboardShortcuts} />
          }
        >
          取消
        </Button>
      </Box>
    </ResponsiveModal>
  )
}

export default NudgeModal
