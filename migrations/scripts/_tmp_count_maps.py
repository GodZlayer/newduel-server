import os
from pathlib import Path
root = Path(r'.\\ogz-client-master\\Maps')
mrs = [p for p in root.glob('*.mrs')]
print('client_mrs_count', len(mrs))
root2 = Path(r'.\\ogz-server-master\\Maps')
print('server_map_dirs', len([p for p in root2.iterdir() if p.is_dir()]))
