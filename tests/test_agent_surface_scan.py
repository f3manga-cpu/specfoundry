import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / 'tools' / 'agent_surface_scan.py'
spec = importlib.util.spec_from_file_location('agent_surface_scan', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SurfaceScanTests(unittest.TestCase):
    def test_detects_actions_without_leaking_code_or_secrets(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'app.py').write_text('import stripe\nrequests.post(url, data=payload)\nsubprocess.run(args)\n')
            (root / '.env').write_text('STRIPE_SECRET_KEY=not-for-output\n')
            (root / 'node_modules').mkdir()
            (root / 'node_modules' / 'bad.js').write_text('stripe stripe stripe')
            result = module.scan(root)
            self.assertEqual(result['files_scanned'], 1)
            self.assertEqual(result['surface_counts']['payment_actions'], 1)
            self.assertEqual(result['surface_counts']['external_http_writes'], 1)
            self.assertEqual(result['surface_counts']['process_execution'], 1)
            self.assertNotIn('not-for-output', json.dumps(result))
            self.assertNotIn('payload', json.dumps(result))

    def test_cli_json(self):
        with tempfile.TemporaryDirectory() as temp:
            (Path(temp) / 'index.ts').write_text('stripe.checkout.sessions.create(input)\n')
            completed = subprocess.run([sys.executable, str(SCRIPT), temp, '--format', 'json'],
                                       capture_output=True, text=True, check=True)
            report = json.loads(completed.stdout)
            self.assertEqual(report['surface_counts']['payment_actions'], 1)
            self.assertIn('limitations', report)


if __name__ == '__main__':
    unittest.main()
