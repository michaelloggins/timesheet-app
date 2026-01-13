/**
 * Department Form Modal
 * Create/Edit department dialog
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
  Switch,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Department, CreateDepartmentDto } from '../../services/departmentService';

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
  switchField: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
});

interface DepartmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateDepartmentDto) => Promise<void>;
  department: Department | null;
  isLoading: boolean;
}

export const DepartmentFormModal = ({
  open,
  onClose,
  onSubmit,
  department,
  isLoading,
}: DepartmentFormModalProps) => {
  const styles = useStyles();
  const [formData, setFormData] = useState<CreateDepartmentDto>({
    departmentCode: '',
    departmentName: '',
    isActive: true,
  });

  useEffect(() => {
    if (department) {
      setFormData({
        departmentCode: department.DepartmentCode,
        departmentName: department.DepartmentName,
        isActive: department.IsActive,
      });
    } else {
      setFormData({
        departmentCode: '',
        departmentName: '',
        isActive: true,
      });
    }
  }, [department, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onClose()}>
      <DialogSurface>
        <form onSubmit={handleSubmit}>
          <DialogBody>
            <DialogTitle>{department ? 'Edit Department' : 'New Department'}</DialogTitle>
            <DialogContent className={styles.form}>
              <div className={styles.field}>
                <Label htmlFor="departmentCode" required>
                  Department Code
                </Label>
                <Input
                  id="departmentCode"
                  value={formData.departmentCode}
                  onChange={(_, data) =>
                    setFormData({ ...formData, departmentCode: data.value })
                  }
                  placeholder="e.g., 1100"
                  required
                />
              </div>

              <div className={styles.field}>
                <Label htmlFor="departmentName" required>
                  Department Name
                </Label>
                <Input
                  id="departmentName"
                  value={formData.departmentName}
                  onChange={(_, data) =>
                    setFormData({ ...formData, departmentName: data.value })
                  }
                  placeholder="e.g., Clinical Laboratory"
                  required
                />
              </div>

              <div className={styles.switchField}>
                <Switch
                  checked={formData.isActive}
                  onChange={(_, data) =>
                    setFormData({ ...formData, isActive: data.checked })
                  }
                />
                <Label>Active</Label>
              </div>
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              <Button appearance="primary" type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : department ? 'Update' : 'Create'}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
};
