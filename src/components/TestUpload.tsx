import { useState } from 'react';

export default function TestUpload() {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setImageUrl('');

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // Test upload
        const response = await fetch('/api/admin/test-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64 })
        });

        const result = await response.json();
        
        if (result.success) {
          setImageUrl(result.url);
          console.log('Upload successful:', result);
        } else {
          setError(result.error || 'Upload failed');
          console.error('Upload failed:', result);
        }
        
        setLoading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Image Upload</h1>
      
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        disabled={loading}
        className="mb-4"
      />
      
      {loading && <p>Uploading...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}
      {imageUrl && (
        <div>
          <p className="text-green-500">Upload successful!</p>
          <p className="text-sm text-gray-600">URL: {imageUrl}</p>
          <img src={imageUrl} alt="Uploaded" className="max-w-xs mt-2" />
        </div>
      )}
    </div>
  );
}
