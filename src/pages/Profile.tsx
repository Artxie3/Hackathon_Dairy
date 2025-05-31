import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Github, MapPin, Link as LinkIcon, Users, Book, Star } from 'lucide-react';

interface GitHubStats {
  publicRepos: number;
  followers: number;
  following: number;
  starredRepos: number;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGitHubStats = async () => {
      try {
        const token = localStorage.getItem('github_token');
        if (!token) return;

        // Fetch user's GitHub stats
        const [userResponse, starredResponse] = await Promise.all([
          fetch(`https://api.github.com/users/${user?.username}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
          fetch(`https://api.github.com/users/${user?.username}/starred`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          }),
        ]);

        if (!userResponse.ok || !starredResponse.ok) {
          throw new Error('Failed to fetch GitHub data');
        }

        const userData = await userResponse.json();
        const starredData = await starredResponse.json();

        setStats({
          publicRepos: userData.public_repos,
          followers: userData.followers,
          following: userData.following,
          starredRepos: starredData.length,
        });
      } catch (error) {
        console.error('Error fetching GitHub stats:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.username) {
      fetchGitHubStats();
    }
  }, [user?.username]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute -bottom-16 left-8">
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-32 h-32 rounded-full border-4 border-white dark:border-gray-800"
              />
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-20 px-8 pb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
                <div className="flex items-center mt-1 text-gray-600 dark:text-gray-400">
                  <Github size={16} className="mr-2" />
                  <a
                    href={`https://github.com/${user.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-blue-500"
                  >
                    {user.username}
                  </a>
                </div>
              </div>
              <a
                href={`https://github.com/${user.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gray-800 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex items-center"
              >
                <Github size={16} className="mr-2" />
                View GitHub Profile
              </a>
            </div>

            {/* GitHub Stats */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                    <Book size={16} className="mr-2" />
                    <span>Repositories</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.publicRepos || 0}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                    <Users size={16} className="mr-2" />
                    <span>Followers</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.followers || 0}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                    <Users size={16} className="mr-2" />
                    <span>Following</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.following || 0}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center text-gray-600 dark:text-gray-400 mb-2">
                    <Star size={16} className="mr-2" />
                    <span>Starred</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats?.starredRepos || 0}
                  </div>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="space-y-4">
              {user.email && (
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <LinkIcon size={16} className="mr-2" />
                  <a href={`mailto:${user.email}`} className="hover:text-blue-500">
                    {user.email}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 