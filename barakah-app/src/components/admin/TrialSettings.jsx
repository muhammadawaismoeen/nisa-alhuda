import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const TrialSettings = () => {
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('global_settings')
      .select('trial_period_days')
      .eq('id', 'config')
      .single();

    if (data) setDays(data.trial_period_days);
    if (error) console.error('Error fetching settings:', error);
  };

  const updateSettings = async () => {
    setLoading(true);
    setMessage('');
    
    const { error } = await supabase
      .from('global_settings')
      .update({ trial_period_days: days })
      .eq('id', 'config');

    setLoading(false);
    if (error) {
      setMessage('Error updating: ' + error.message);
    } else {
      setMessage('Trial period updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #333', borderRadius: '8px', marginTop: '20px', backgroundColor: '#1a1a1a' }}>
      <h3 style={{ color: '#fff', marginBottom: '15px' }}>Subscription Settings</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label style={{ color: '#ccc' }}>Free Trial Duration (Days):</label>
        <input 
          type="number" 
          value={days} 
          onChange={(e) => setDays(parseInt(e.target.value))}
          style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #444', background: '#000', color: '#fff' }}
        />
        <button 
          onClick={updateSettings}
          disabled={loading}
          style={{ padding: '5px 15px', borderRadius: '4px', background: '#4CAF50', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      {message && <p style={{ color: message.includes('Error') ? '#ff4d4d' : '#4CAF50', marginTop: '10px' }}>{message}</p>}
    </div>
  );
};

export default TrialSettings;