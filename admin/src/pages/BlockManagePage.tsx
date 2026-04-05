import { useAdmin } from '../contexts/AdminContext';
import { Unlock } from 'lucide-react';

export default function BlockManagePage() {
  const { blocks, removeBlock } = useAdmin();

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">
        차단 관리 <span className="text-navy/50 font-normal">({blocks.length})</span>
      </h1>

      {blocks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500 font-medium">차단 내역이 없습니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">차단한 유저</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">차단된 유저</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">차단일</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase text-right">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {blocks.map((blk) => (
                <tr key={blk.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-3">
                    <div className="text-sm font-medium text-gray-900">{blk.blockerName}</div>
                    <div className="text-xs text-gray-400">{blk.blockerId}</div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="text-sm font-medium text-gray-900">{blk.blockedName}</div>
                    <div className="text-xs text-gray-400">{blk.blockedId}</div>
                  </td>
                  <td className="px-6 py-3 text-xs text-gray-500">{new Date(blk.createdAt).toLocaleString('ko-KR')}</td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => removeBlock(blk.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg hover:bg-amber-200 ml-auto">
                      <Unlock size={12} /> 차단 해제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
