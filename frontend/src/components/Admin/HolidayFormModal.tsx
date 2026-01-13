/**
 * Holiday Form Modal
 * Create/Edit holiday dialog
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Input,
  Label,
  SpinButton,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Holiday, CreateHolidayDto } from '../../services/holidayService';

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
});

interface HolidayFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateHolidayDto) => Promise<void>;
  holiday: Holiday | null;
  isLoading: boolean;
}

export const HolidayFormModal = ({
  open,
  onClose,
  onSubmit,
  holiday,
  isLoading,
}: HolidayFormModalProps) => {
  const styles = useStyles();
  const [formData, setFormData] = useState<CreateHolidayDto>({
    holidayName: '',
    holidayDate: '',
    defaultHours: 8,
  });

  useEffect(() => {
    if (holiday) {
      setFormData({
        holidayName: holiday.HolidayName,
        holidayDate: holiday.HolidayDate.split('T')[0], // Format for date input
        defaultHours: holiday.DefaultHours,
      });
    } else {
      setFormData({
        holidayName: '',
        holidayDate: '',
        defaultHours: 8,
      });
    }
  }, [holiday, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>{holiday ? 'Edit Holiday' : 'New Holiday'}</DialogTitle>
            <DialogContent className={styles.form}>
              <div className={styles.field}>
                <Label htmlFor="holidayName" required>
                  Holiday Name
                </Label>
                <Input
                  id="holidayName"
                  value={formData.holidayName}
                  onChange={(_, data) =>
                    setFormData({ ...formData, holidayName: data.value })
                  }
                  placeholder="e.g., Christmas Day"
                  required
                />
              </div>

              <div className={styles.field}>
                <Label htmlFor="holidayDate" required>
                  Date
                </Label>
                <Input
                  id="holidayDate"
                  type="date"
                  value={formData.holidayDate}
                  onChange={(_, data) =>
                    setFormData({ ...formData, holidayDate: data.value })
                  }
                  required
                />
              </div>

              <div className={styles.field}>
                <Label htmlFor="defaultHours">
                  Default Hours
                </Label>
                <SpinButton
                  id="defaultHours"
                  value={formData.defaultHours}
                  onChange={(_, data) =>
                    setFormData({ ...formData, defaultHours: data.value || 8 })
                  }
                  min={0}
                  max={24}
                  step={0.5}
                />
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button appearance="primary" type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : holiday ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};
