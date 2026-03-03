import Swal from 'sweetalert2';
import { getRoleInfo, hasAdminAccess } from '../config/roleConfig';

/**
 * Show a compact role switcher popup — green theme, mobile-friendly
 */
export function showSwitchRolePopup({ userRoles, activeRole, switchRole, navigate }) {
    const items = userRoles.map(role => {
        const info = getRoleInfo(role.name);
        const isActive = role.name === activeRole;
        const bg = isActive ? '#ecfdf5' : '#fff';
        const border = isActive ? '2px solid #10b981' : '1px solid #f3f4f6';
        const iconBg = isActive ? '#10b981' : '#f3f4f6';
        const iconColor = isActive ? '#fff' : '#9ca3af';
        const textColor = isActive ? '#065f46' : '#374151';
        const textWeight = isActive ? '600' : '400';
        const trail = isActive
            ? '<i class="fas fa-check-circle" style="color:#10b981;font-size:13px"></i>'
            : '';

        return [
            '<button class="swal-role-btn" data-role="', role.name, '"',
            ' style="display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border:', border, ';border-radius:8px;background:', bg, ';cursor:pointer;margin-bottom:4px;transition:all 0.15s;outline:none">',
            '<div style="width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:', iconBg, ';flex-shrink:0">',
            '<i class="fas ', info.icon, '" style="color:', iconColor, ';font-size:10px"></i></div>',
            '<span style="flex:1;text-align:left;font-size:12px;font-weight:', textWeight, ';color:', textColor, '">', info.label, '</span>',
            trail,
            '</button>'
        ].join('');
    }).join('');

    Swal.fire({
        html: '<div style="text-align:left">' + items + '</div>',
        title: 'Ganti Peran',
        showConfirmButton: false,
        showCloseButton: true,
        width: '220px',
        padding: '8px 10px 10px',
        customClass: {
            popup: 'rounded-xl',
            title: '!text-sm !pt-1 !pb-1 !mb-0',
            htmlContainer: '!mt-1 !mx-0 !px-0',
            closeButton: '!text-gray-400 !text-lg',
        },
        didOpen: () => {
            Swal.getPopup().querySelectorAll('.swal-role-btn').forEach(btn => {
                btn.addEventListener('mouseenter', () => {
                    const r = btn.getAttribute('data-role');
                    if (r !== activeRole) btn.style.background = '#f0fdf4';
                });
                btn.addEventListener('mouseleave', () => {
                    const r = btn.getAttribute('data-role');
                    if (r !== activeRole) btn.style.background = '#fff';
                });
                btn.addEventListener('click', () => {
                    const roleName = btn.getAttribute('data-role');
                    if (roleName !== activeRole) {
                        const success = switchRole(roleName);
                        if (success) {
                            Swal.close();
                            if (hasAdminAccess(roleName)) {
                                navigate('/dashboard');
                            } else {
                                navigate('/guru');
                            }
                        }
                    } else {
                        Swal.close();
                    }
                });
            });
        }
    });
}
