// Utility to download a file from a public certificate endpoint
// Usage: downloadPublicCertificate(certificateId, filename)
import { API_URL } from './api';

export function downloadPublicCertificate(certificateId, filename = 'certificate.pdf') {
  const url = `${API_URL.replace(/\/api$/, '')}/api/public/certificate/${certificateId}/download`;
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
}
