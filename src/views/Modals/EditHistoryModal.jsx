import { Box, Button, FormLabel, Input, Typography } from '@mui/joy'
import moment from 'moment'
import { useEffect, useState } from 'react'

import { useResponsiveModal } from '../../hooks/useResponsiveModal'
import ConfirmationModal from './Inputs/ConfirmationModal'

function EditHistoryModal({ config, historyRecord }) {
  const { ResponsiveModal } = useResponsiveModal()

  // 初始化状态，提供合理的默认值
  const [completedDate, setCompletedDate] = useState(() => {
    if (historyRecord && historyRecord.completedDate) {
      return moment(historyRecord.completedDate).format('YYYY-MM-DDTHH:mm')
    }
    return ''
  })
  
  const [dueDate, setDueDate] = useState(() => {
    if (historyRecord && historyRecord.dueDate) {
      return moment(historyRecord.dueDate).format('YYYY-MM-DDTHH:mm')
    }
    return ''
  })
  
  const [notes, setNotes] = useState(() => {
    return historyRecord ? (historyRecord.notes || '') : ''
  })
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  
  // 当 historyRecord 变化时更新状态
  useEffect(() => {
    if (historyRecord) {
      setCompletedDate(
        historyRecord.performedAt 
          ? moment(historyRecord.performedAt).format('YYYY-MM-DDTHH:mm')
          : ''
      )
      setDueDate(
        historyRecord.dueDate 
          ? moment(historyRecord.dueDate).format('YYYY-MM-DDTHH:mm')
          : ''
      )
      setNotes(historyRecord.notes || '')
    }
  }, [historyRecord])

  return (
    <ResponsiveModal
      open={config?.isOpen}
      onClose={config?.onClose}
      size='lg'
      // fullWidth={true}
    >
      <Typography level='h4' mb={1}>
        编辑历史记录
      </Typography>
      <FormLabel>截止日期</FormLabel>
      <Input
        type='datetime-local'
        value={dueDate}
        onChange={e => {
          setDueDate(e.target.value)
        }}
      />
      <FormLabel>完成日期</FormLabel>
      <Input
        type='datetime-local'
        value={completedDate}
        onChange={e => {
          setCompletedDate(e.target.value)
        }}
      />
      <FormLabel>备注</FormLabel>
      <Input
        fullWidth
        multiline
        label='附加备注'
        placeholder='附加备注'
        value={notes || ''}
        onChange={e => {
          if (e.target.value.trim() === '') {
            setNotes(null)
            return
          }
          setNotes(e.target.value)
        }}
        size='md'
        sx={{
          mb: 1,
        }}
      />

      {/* 3 button save , cancel and delete */}
      <Box display={'flex'} justifyContent={'space-around'} mt={1}>
        <Button
          size='lg'
          onClick={() =>
            config.onSave({
              id: historyRecord?.id,
              performedAt: completedDate ? moment(completedDate).toISOString() : null,
              dueDate: dueDate ? moment(dueDate).toISOString() : null,
              notes,
            })
          }
          fullWidth
          sx={{ mr: 1 }}
        >
          保存
        </Button>
        <Button fullWidth size='lg' onClick={config.onClose} variant='outlined'>
          取消
        </Button>
      </Box>
      <ConfirmationModal
        config={{
          isOpen: isDeleteModalOpen,
          onClose: isConfirm => {
            if (isConfirm) {
              config.onDelete(historyRecord?.id)
            }
            setIsDeleteModalOpen(false)
          },
          title: '删除历史记录',
          message: '您确定要删除这条历史记录吗？',
          confirmText: '删除',
          cancelText: '取消',
        }}
      />
    </ResponsiveModal>
  )
}
export default EditHistoryModal