'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOperadorContext } from '@/contexts/OperadorContext';
import {
  collection,
  query,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Usuario, RolUsuario, ROL_LABELS } from '@/types';
import { registrarAuditoria } from '@/lib/firebase/auditoria';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  Shield,
  X,
  Check,
  UserCog,
  Eye,
  EyeOff,
  Key,
  RefreshCw,
} from 'lucide-react';

export default function AdminUsuariosPage() {
  const { user, claims, hasRole } = useAuth();
  const { operadorActualId } = useOperadorContext();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'tecnico' as RolUsuario,
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const canManageUsers = hasRole(['admin', 'jefe_mantenimiento']);

  // Función para generar contraseña aleatoria segura
  const generatePassword = () => {
    const length = 12;
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%&*';
    const allChars = lowercase + uppercase + numbers + symbols;
    
    // Asegurar al menos un carácter de cada tipo
    let password = 
      lowercase[Math.floor(Math.random() * lowercase.length)] +
      uppercase[Math.floor(Math.random() * uppercase.length)] +
      numbers[Math.floor(Math.random() * numbers.length)] +
      symbols[Math.floor(Math.random() * symbols.length)];
    
    // Completar el resto de la contraseña
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Mezclar los caracteres
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    setFormData({ ...formData, password });
    setShowPassword(true); // Mostrar la contraseña generada
  };

  useEffect(() => {
    loadUsuarios();
  }, [operadorActualId]);

  const loadUsuarios = async () => {
    if (!operadorActualId) return;

    setLoading(true);
    try {
      const usuariosRef = collection(db, `tenants/${operadorActualId}/usuarios`);
      const q = query(usuariosRef);
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Usuario[];
      
      setUsuarios(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (usuario?: Usuario) => {
    if (usuario) {
      setEditingUser(usuario);
      setFormData({
        nombre: usuario.nombre,
        email: usuario.email,
        password: '',
        rol: usuario.rol,
        activo: usuario.activo,
      });
    } else {
      setEditingUser(null);
      setFormData({
        nombre: '',
        email: '',
        password: '',
        rol: 'tecnico',
        activo: true,
      });
    }
    setShowPassword(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSave = async () => {
    if (!operadorActualId || !user) return;

    setSaving(true);
    try {
      if (editingUser) {
        // Actualizar usuario existente
        const response = await fetch('/api/users', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: editingUser.id,
            email: formData.email,
            password: formData.password || undefined,
            nombre: formData.nombre,
            rol: formData.rol,
            tenantId: operadorActualId,
            activo: formData.activo,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al actualizar usuario');
        }

        await registrarAuditoria({
          tenantId: operadorActualId,
          accion: 'update',
          coleccion: 'usuarios',
          documentoId: editingUser.id,
          cambios: {
            antes: { nombre: editingUser.nombre, rol: editingUser.rol, activo: editingUser.activo },
            despues: { nombre: formData.nombre, rol: formData.rol, activo: formData.activo },
          },
          usuarioId: user.uid,
          usuarioEmail: user.email || '',
        });
      } else {
        // Crear nuevo usuario
        const response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            nombre: formData.nombre,
            rol: formData.rol,
            tenantId: operadorActualId,
            activo: formData.activo,
          }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || 'Error al crear usuario');
        }

        await registrarAuditoria({
          tenantId: operadorActualId,
          accion: 'create',
          coleccion: 'usuarios',
          documentoId: result.uid,
          cambios: {
            antes: null,
            despues: { nombre: formData.nombre, email: formData.email, rol: formData.rol },
          },
          usuarioId: user.uid,
          usuarioEmail: user.email || '',
        });
      }

      await loadUsuarios();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving user:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (usuario: Usuario) => {
    if (!operadorActualId || !user) return;
    if (!confirm(`¿Estás seguro de eliminar al usuario ${usuario.nombre}?`)) return;

    try {
      const response = await fetch(`/api/users?uid=${usuario.id}&tenantId=${operadorActualId}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Error al eliminar usuario');
      }

      await registrarAuditoria({
        tenantId: operadorActualId,
        accion: 'delete',
        coleccion: 'usuarios',
        documentoId: usuario.id,
        cambios: {
          antes: usuario,
          despues: null,
        },
        usuarioId: user.uid,
        usuarioEmail: user.email || '',
      });

      await loadUsuarios();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert(error instanceof Error ? error.message : 'Error al eliminar usuario');
    }
  };

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRolBadgeClass = (rol: RolUsuario) => {
    const classes: Record<RolUsuario, string> = {
      admin: 'bg-red-100 text-red-800',
      dfg: 'bg-purple-100 text-purple-800',
      operador: 'bg-blue-100 text-blue-800',
      jefe_mantenimiento: 'bg-green-100 text-green-800',
      tecnico: 'bg-yellow-100 text-yellow-800',
    };
    return classes[rol] || 'bg-gray-100 text-gray-800';
  };

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No tienes permisos para gestionar usuarios</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administración de usuarios y roles</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Nuevo Usuario
        </button>
      </div>

      {/* Search */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(ROL_LABELS).map(([rol, label]) => {
          const count = usuarios.filter((u) => u.rol === rol).length;
          return (
            <div key={rol} className="card text-center">
              <p className="text-2xl font-bold text-lurraldebus-primary">{count}</p>
              <p className="text-sm text-gray-500">{label}</p>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lurraldebus-primary mx-auto"></div>
            <p className="text-gray-500 mt-2">Cargando usuarios...</p>
          </div>
        ) : filteredUsuarios.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Usuario</th>
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Rol</th>
                  <th className="table-header-cell">Estado</th>
                  <th className="table-header-cell">Acciones</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {filteredUsuarios.map((usuario) => (
                  <tr key={usuario.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-lurraldebus-primary flex items-center justify-center">
                          <span className="text-white font-medium">
                            {usuario.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{usuario.nombre}</span>
                      </div>
                    </td>
                    <td className="table-cell text-gray-500">{usuario.email}</td>
                    <td className="table-cell">
                      <span className={`badge ${getRolBadgeClass(usuario.rol)}`}>
                        {ROL_LABELS[usuario.rol]}
                      </span>
                    </td>
                    <td className="table-cell">
                      {usuario.activo ? (
                        <span className="badge bg-green-100 text-green-800">Activo</span>
                      ) : (
                        <span className="badge bg-red-100 text-red-800">Inactivo</span>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenModal(usuario)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(usuario)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserCog className="w-5 h-5 text-lurraldebus-primary" />
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  type="text"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="input-field"
                  placeholder="Nombre completo"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <label className="label flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Contraseña {editingUser && <span className="text-xs text-gray-400">(dejar vacío para mantener actual)</span>}
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="input-field pr-10"
                      placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                    title="Generar contraseña segura"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generar
                  </button>
                </div>
                {!editingUser && formData.password && formData.password.length < 6 && (
                  <p className="text-xs text-red-500 mt-1">La contraseña debe tener al menos 6 caracteres</p>
                )}
                {formData.password && formData.password.length >= 6 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Contraseña válida ({formData.password.length} caracteres)
                  </p>
                )}
              </div>
              <div>
                <label className="label">Rol</label>
                <select
                  value={formData.rol}
                  onChange={(e) => setFormData({ ...formData, rol: e.target.value as RolUsuario })}
                  className="input-field"
                >
                  {Object.entries(ROL_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="w-4 h-4 text-lurraldebus-primary border-gray-300 rounded focus:ring-lurraldebus-primary"
                />
                <label htmlFor="activo" className="text-sm text-gray-700">
                  Usuario activo
                </label>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={handleCloseModal} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.nombre || !formData.email || (!editingUser && (!formData.password || formData.password.length < 6))}
                className="btn-primary flex items-center gap-2"
              >
                {saving ? (
                  'Guardando...'
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
