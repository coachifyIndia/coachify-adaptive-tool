import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    age: '',
    segment: 'competitive_exam',
    target_exam: '',
  });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await register({
        ...formData,
        age: parseInt(formData.age, 10),
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              sign in to existing account
            </Link>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="-space-y-px rounded-md shadow-sm">
            <div className="mb-4">
              <Input
                name="name"
                type="text"
                required
                className="mb-2"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
              />
              <Input
                name="email"
                type="email"
                required
                className="mb-2"
                placeholder="Email address"
                value={formData.email}
                onChange={handleChange}
              />
              <Input
                name="password"
                type="password"
                required
                className="mb-2"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
              />
              <Input
                name="age"
                type="number"
                required
                className="mb-2"
                placeholder="Age"
                value={formData.age}
                onChange={handleChange}
              />
              <select
                name="segment"
                value={formData.segment}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background mb-2"
              >
                <option value="9_10_foundation">9-10 Foundation</option>
                <option value="11_12_science">11-12 Science</option>
                <option value="competitive_exam">Competitive Exam</option>
              </select>
              <Input
                name="target_exam"
                type="text"
                className="mb-2"
                placeholder="Target Exam (Optional)"
                value={formData.target_exam}
                onChange={handleChange}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <div>
            <Button
              type="submit"
              className="group relative flex w-full justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Registering...' : 'Register'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
