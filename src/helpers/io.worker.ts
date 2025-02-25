import SyncWorker from './SyncWorker.worker';
import { _workerActions } from './io';

(new SyncWorker(_workerActions)).start();
