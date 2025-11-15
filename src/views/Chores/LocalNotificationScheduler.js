import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import murmurhash from 'murmurhash'

const getNotificationPreferences = async () => {
  const ret = await Preferences.get({ key: 'notificationPreferences' })
  return JSON.parse(ret.value)
}

const canScheduleNotification = async () => {
  if (Capacitor.isNativePlatform() === false) {
    return false
  }
  const notificationPreferences = await getNotificationPreferences()
  console.log('Notification preferences:', notificationPreferences)

  if (notificationPreferences['granted'] === false) {
    return false
  }
  return true
}

const getIdFromTemplate = (choreId, template) => {
  const hash = murmurhash.v3(`${choreId}-${template.value}-${template.unit}`)
  // Use Math.abs() with modulo to ensure positive ID within Java int range
  // This guarantees the ID is always positive and within 1 to 2^31-1
  return Math.abs(hash) % 2147483647
}

const getTimeFromTemplate = (template, relativeTime) => {
  let time = relativeTime
  switch (template.unit) {
    case 'm':
      time = new Date(relativeTime.getTime() + template.value * 60 * 1000)
      break
    case 'h':
      time = new Date(relativeTime.getTime() + template.value * 60 * 60 * 1000)
      break
    case 'd':
      time = new Date(
        relativeTime.getTime() + template.value * 24 * 60 * 60 * 1000,
      )
      break
    default:
      time = relativeTime
  }
  return time
}
const scheduleNotificationFromTemplate = (
  chore,
  userProfile,
  allPerformers,
  notifications,
) => {
  for (const template of chore.notificationMetadata?.templates || []) {
    // convert the template to time:
    const dueDate = new Date(chore.nextDueDate)
    const now = new Date()
    const time = getTimeFromTemplate(template, dueDate)
    const notificationId = getIdFromTemplate(chore.id, template)
    const { title, body } = getNotificationText(chore.name, template)
    if (time > now) {
      notifications.push({
        title,
        body: `${body} at ${time.toLocaleTimeString()}`,
        id: notificationId,
        allowWhileIdle: true,
        schedule: {
          at: time,
        },
        extra: {
          choreId: chore.id,
        },
      })
    }
  }
}

const getNotificationText = (choreName, template = {}) => {
  // Determine notification type based on template value
  const getNotificationType = () => {
    if (!template || template.value === undefined) {
      return '到期'
    }

    if (template.value < 0) {
      return '提醒'
    } else if (template.value === 0) {
      return '到期'
    } else {
      return '逾期'
    }
  }

  const notificationType = getNotificationType()

  // Truncate chore name if too long for better readability
  const maxChoreNameLength = 25
  const truncatedName =
    choreName.length > maxChoreNameLength
      ? `${choreName.substring(0, maxChoreNameLength)}...`
      : choreName

  // Generate time-based descriptive text
  const getTimeDescription = () => {
    if (!template || !template.value || !template.unit) {
      return '即将到期'
    }

    const { value, unit } = template
    const absValue = Math.abs(value)

    switch (unit) {
      case 'm':
        if (absValue === 1) return value < 0 ? '1分钟后' : '1分钟前'
        if (absValue < 60)
          return value < 0
            ? `${absValue}分钟后`
            : `${absValue}分钟前`
        break
      case 'h':
        if (absValue === 1) return value < 0 ? '1小时后' : '1小时前'
        if (absValue < 24)
          return value < 0 ? `${absValue}小时后` : `${absValue}小时前`
        break
      case 'd':
        if (absValue === 1) return value < 0 ? '明天' : '昨天'
        if (absValue === 7) return value < 0 ? '下周' : '上周'
        if (absValue < 7)
          return value < 0 ? `${absValue}天后` : `${absValue}天前`
        if (absValue < 30) {
          const weeks = Math.round(absValue / 7)
          return value < 0 ? `${weeks}周后` : `${weeks}周前`
        }
        break
      default:
        return value < 0 ? `${absValue}${unit}后` : `${absValue}${unit}前`
    }

    return value < 0 ? `${absValue}${unit}后` : `${absValue}${unit}前`
  }

  const messages = {
    reminder: {
      title: `📋 ${truncatedName}`,
      body: `提醒：${getTimeDescription()}截止`,
    },
    due: {
      title: `🔔 ${truncatedName}`,
      body: '任务已到期，请立即处理！',
    },
    overdue: {
      title: `❗ ${truncatedName}`,
      body: `已过期${getTimeDescription()}，请尽快完成`,
    },
  }

  // Fallback to due if type not found
  const messageTemplate = messages[notificationType] || messages.due

  return {
    title: messageTemplate.title,
    body: messageTemplate.body,
  }
}
const cancelPendingNotifications = async () => {
  try {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications })
      console.log('Cancelled pending notifications:', pending.notifications)
    } else {
      console.log('No pending notifications to cancel.')
    }
  } catch (error) {
    console.error('Error cancelling pending notifications:', error)
  }
}
const scheduleChoreNotification = async (
  chores,
  userProfile,
  allPerformers,
) => {
  await cancelPendingNotifications()
  const notifications = []

  for (let i = 0; i < chores.length; i++) {
    const chore = chores[i]
    try {
      if (chore.notification === false || chore.nextDueDate === null) {
        continue
      }
      scheduleNotificationFromTemplate(
        chore,
        userProfile,
        allPerformers,
        notifications,
      )
    } catch (error) {
      console.error(
        'Error parsing notification metadata for chore:',
        chore.id,
        error,
      )
      continue
    }
  }

  LocalNotifications.schedule({
    notifications,
  })
  return notifications
}

export { canScheduleNotification, scheduleChoreNotification }
