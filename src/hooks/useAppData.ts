import { useAppDataContext } from '../providers/AppDataProvider';

export function useAppData() {
  return useAppDataContext();
}
