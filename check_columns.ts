import { executeQuery, getVMSConfig } from './app/modules/vms-plus-user-sync/db/utils';
async function check() {
  const config = await getVMSConfig();
  const columns = await executeQuery("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'UserMaster'", {}, config);
  console.log(JSON.stringify(columns));
}
check();
