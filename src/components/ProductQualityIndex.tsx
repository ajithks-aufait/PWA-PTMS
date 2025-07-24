import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";

type CycleResult = {
  started: boolean;
  completed: boolean;
  defects: string[]; // holds item names like "CBB 1"
  okays: string[];
};

type CycleStatusMap = {
  [cycleNo: number]: CycleResult;
};

type SelectionItem = {
  status: "Okay" | "Not Okay" | null;
  category?: string;
  defect?: string;
  majorDefect?: string;
};

type SelectedMap = {
  [cycleNo: number]: Record<string, SelectionItem>;
};

const checklistItems: { [key: number]: string[] } = {
  1: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  2: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  3: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  4: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  5: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  6: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  7: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
  8: ["CBB 1", "CBB 2", "CBB 3", "CBB 4", "CBB 5", "CBB 6", "CBB 7", "CBB 8", "CBB 9", "CBB 10"],
};

const totalCycles = 8;

const ProductQualityIndex: React.FC = () => {
  const [activeCycle, setActiveCycle] = useState<number>(1);
  const [cycleStatus, setCycleStatus] = useState<CycleStatusMap>(
    Object.fromEntries(
      Array.from({ length: totalCycles }, (_, i) => [
        i + 1,
        { started: false, completed: false, defects: [], okays: [] },
      ])
    )
  );
  const [selected, setSelected] = useState<SelectedMap>({});
  const [showDetails, setShowDetails] = useState(false);
  const navigate = useNavigate();
  const handleStart = (cycleNo: number) => {
    const items = checklistItems[cycleNo] || [];
    const initialState: Record<string, SelectionItem> = {};
    items.forEach((item) => {
      initialState[item] = { status: null };
    });

    setCycleStatus((prev) => ({
      ...prev,
      [cycleNo]: { ...prev[cycleNo], started: true },
    }));

    setSelected((prev) => ({
      ...prev,
      [cycleNo]: initialState,
    }));
  };

  const handleSelect = (
    cycleNo: number,
    item: string,
    value: "Okay" | "Not Okay"
  ) => {
    setSelected((prev) => ({
      ...prev,
      [cycleNo]: {
        ...prev[cycleNo],
        [item]: {
          ...prev[cycleNo][item],
          status: value,
        },
      },
    }));
  };

  const updateField = (
    cycleNo: number,
    item: string,
    field: keyof SelectionItem,
    value: string
  ) => {
    setSelected((prev) => ({
      ...prev,
      [cycleNo]: {
        ...prev[cycleNo],
        [item]: {
          ...prev[cycleNo][item],
          [field]: value,
        },
      },
    }));
  };

  const handleSave = (cycleNo: number) => {
    const defects: string[] = [];
    const okays: string[] = [];

    const currentSelections = selected[cycleNo];
    Object.entries(currentSelections || {}).forEach(([key, val]) => {
      if (val.status === "Okay") okays.push(key);
      else if (val.status === "Not Okay") defects.push(key);
    });

    setCycleStatus((prev) => ({
      ...prev,
      [cycleNo]: {
        ...prev[cycleNo],
        completed: true,
        defects,
        okays,
      },
    }));

    setActiveCycle((prev) => prev + 1);
  };

  return (
    <DashboardLayout>
      {/* Back Button */}
      <div className="mb-4 flex items-center gap-2 text-blue-600 font-medium cursor-pointer" onClick={() => navigate('/home')}>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </div>

      {/* Header and Summary Section (updated style) */}
      <div className="bg-gray-100 p-6 rounded-lg mb-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-semibold text-lg">Product Quality Index</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 text-xs font-medium ml-2">
            <span className="w-2 h-2 bg-gray-500 rounded-full mr-1"></span>
            Shift 1
          </span>
          <span className="text-gray-500 text-sm ml-2">• 24/07/2025</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-base">Summary</span>
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-sm font-medium">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 9l-6 6m0-6l6 6" />
                </svg>
                2 Defects
              </span>
            </div>
            <button
              className="text-blue-700 text-sm font-medium underline"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? "View less" : "View more"}
            </button>
          </div>
          {showDetails && (
            <div className="mt-4">
              <table className="w-full text-sm text-left border-separate border-spacing-0">
                <thead>
                  <tr className="text-gray-700 border-b border-gray-200">
                    <th className="font-semibold py-2 px-2">Category</th>
                    <th className="font-semibold text-green-700 py-2 px-2">Okays</th>
                    <th className="font-semibold text-red-700 py-2 px-2">A Defects</th>
                    <th className="font-semibold text-red-700 py-2 px-2">B Defects</th>
                    <th className="font-semibold text-red-700 py-2 px-2">C Defects</th>
                    <th className="font-semibold text-green-700 py-2 px-2">Nos of Hrs inspection/production</th>
                    <th className="font-semibold text-green-700 py-2 px-2">Max Potential Score</th>
                    <th className="font-semibold py-2 px-2">Score deduction</th>
                    <th className="font-semibold py-2 px-2">Score obtained</th>
                    <th className="font-semibold py-2 px-2">Score%"</th>
                    <th className="font-semibold py-2 px-2">PQI Score as per weightage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-500">
                  <tr className="bg-yellow-50 align-middle">
                    <td className="py-4 px-2">Secondary</td>
                    <td className="py-4 px-2">11</td>
                    <td className="py-4 px-2">1</td>
                    <td className="py-4 px-2">0</td>
                    <td className="py-4 px-2">0</td>
                    <td className="py-4 px-2">3</td>
                    <td className="py-4 px-2">720</td>
                    <td className="py-4 px-2">80</td>
                    <td className="py-4 px-2">640</td>
                    <td className="py-4 px-2">88.89%</td>
                    <td className="py-4 px-2">13.33%</td>
                  </tr>
                  <tr className="bg-white align-middle">
                    <td className="py-4 px-2">CBB Evaluation</td>
                    <td className="py-4 px-2">3</td>
                    <td className="py-4 px-2">0</td>
                    <td className="py-4 px-2">1</td>
                    <td className="py-4 px-2">0</td>
                    <td className="py-4 px-2">3</td>
                    <td className="py-4 px-2">3600</td>
                    <td className="py-4 px-2">30</td>
                    <td className="py-4 px-2">3570</td>
                    <td className="py-4 px-2">99.17%</td>
                    <td className="py-4 px-2">9.92%</td>
                  </tr>
                  <tr className="bg-white align-middle">
                    <td className="py-4 px-2">Net Wt.</td>
                    <td className="py-4 px-2"></td>
                    <td className="py-4 px-2"></td>
                    <td className="py-4 px-2"></td>
                    <td className="py-4 px-2"></td>
                    <td className="py-4 px-2">3</td>
                    <td className="py-4 px-2">5625</td>
                    <td className="py-4 px-2">0</td>
                    <td className="py-4 px-2">5625</td>
                    <td className="py-4 px-2">100.00%</td>
                    <td className="py-4 px-2">15.00%</td>
                  </tr>
                  <tr className="bg-white align-middle">
                    <td className="py-4 px-2">Broken %</td>
                    <td className="py-4 px-2" colSpan={10}>0.00%</td>
                  </tr>
                  <tr className="bg-white align-middle">
                    <td className="py-4 px-2">Final PQI Score post deduction of broken</td>
                    <td className="py-4 px-2" colSpan={10}>38.25%</td>
                  </tr>
                  <tr>
                    <td className="font-semibold py-4 px-2">PQI Status</td>
                    <td colSpan={10} className="p-0">
                      <div className="bg-red-500 text-white text-center py-2 rounded-b-lg font-bold">HOLD</div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Cycles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Sidebar (page-specific) */}
        <div className="space-y-2">
          <button className="w-full text-left px-4 py-2 bg-blue-100 text-blue-600 rounded-md font-medium border border-blue-200">CBB Evaluation</button>
          <button className="w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-md">Secondary</button>
          <button className="w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-md">Primary</button>
          <button className="w-full text-left px-4 py-2 bg-white border border-gray-200 rounded-md">Product</button>
        </div>
        {/* Main Content - Cycles */}
        <div className="md:col-span-3 space-y-6 max-h-screen overflow-y-auto">
          {Array.from({ length: totalCycles }, (_, i) => {
            const cycleNo = i + 1;
            const status = cycleStatus[cycleNo];
            const items = checklistItems[cycleNo] || [];

            const shouldRender = cycleNo <= 2 || cycleNo <= activeCycle + 1;
            if (!shouldRender) return null;

            const isDisabled = cycleNo > activeCycle;

            return (
              <div
                key={cycleNo}
                className={`border rounded-md p-4 shadow-sm ${isDisabled ? "bg-gray-100 opacity-60" : "bg-white"
                  }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-md font-semibold">
                    Cycle {cycleNo}{" "}
                    {status.completed && status.defects.length > 0 && (
                      <span className="ml-2 text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-xs">
                        {status.defects.length} Defect(s)
                      </span>
                    )}
                  </h2>
                </div>

                {!status.started && !isDisabled && (
                  <div className="space-y-6">
                    {/* Form Fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Product</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          placeholder="Enter Product"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Batch No</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          placeholder="Enter Batch No"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Line No</label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2"
                          placeholder="Enter Line No"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Packaged</label>
                        <input
                          type="date"
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Expiry</label>
                        <input
                          type="date"
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                    </div>

                    {/* Start Button */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleStart(cycleNo)}
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                      >
                        Start Session
                      </button>
                    </div>
                  </div>
                )}


                {status.started && !status.completed && (
                  <div className="space-y-6 mt-4">
                    {items.map((item) => {
                      const current = selected[cycleNo]?.[item];
                      return (
                        <div key={item} className="border p-4 rounded">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold">{item}</h3>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSelect(cycleNo, item, "Not Okay")}
                                className={`px-3 py-1 rounded border ${current?.status === "Not Okay"
                                  ? "bg-red-100 border-red-600 text-red-600"
                                  : "border-red-400 text-red-500"
                                  }`}
                              >
                                Not Okay
                              </button>
                              <button
                                onClick={() => handleSelect(cycleNo, item, "Okay")}
                                className={`px-3 py-1 rounded border ${current?.status === "Okay"
                                  ? "bg-green-100 border-green-600 text-green-600"
                                  : "border-green-400 text-green-500"
                                  }`}
                              >
                                Okay
                              </button>
                            </div>
                          </div>

                          {current?.status === "Not Okay" && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                              <div>
                                <label className="block text-sm font-medium mb-1">Select Category</label>
                                <select
                                  className="w-full border rounded px-3 py-2"
                                  value={current.category || ""}
                                  onChange={(e) => updateField(cycleNo, item, "category", e.target.value)}
                                >
                                  <option value="">Select</option>
                                  <option value="Category A">Category A</option>
                                  <option value="Category B">Category B</option>
                                  <option value="Category C">Category C</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-sm font-medium mb-1">Defect</label>
                                <input
                                  type="text"
                                  className="w-full border rounded px-3 py-2"
                                  placeholder="Enter Defect"
                                  value={current.defect || ""}
                                  onChange={(e) => updateField(cycleNo, item, "defect", e.target.value)}
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-sm font-medium mb-1">Major Defect and Remarks</label>
                                <input
                                  type="text"
                                  className="w-full border rounded px-3 py-2"
                                  placeholder="Enter Major Defect or Remarks"
                                  value={current.majorDefect || ""}
                                  onChange={(e) => updateField(cycleNo, item, "majorDefect", e.target.value)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="flex justify-end gap-2 mt-4">
                      <button className="px-4 py-2 border rounded">Cancel</button>
                      <button
                        onClick={() => handleSave(cycleNo)}
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                      >
                        Save Session
                      </button>
                    </div>
                  </div>
                )}

                {status.completed && (
                  <div className="bg-white shadow-sm rounded-md p-4 mt-4">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-md font-semibold">
                        Cycle {cycleNo}
                        {status.defects.length > 0 && (
                          <span className="ml-2 text-red-600 bg-red-100 px-2 py-0.5 rounded-full text-xs">
                            {status.defects.length} Defects
                          </span>
                        )}
                      </div>
                      <button className="text-gray-500 hover:text-gray-700">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Defects Table */}
                    {status.defects.length > 0 && (
                      <div className="mb-4">
                        <div className="text-red-600 font-medium mb-2">Defects</div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm border rounded-md">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="px-4 py-2 border">CBB No</th>
                                <th className="px-4 py-2 border">Defect Category</th>
                                <th className="px-4 py-2 border">Defect</th>
                                <th className="px-4 py-2 border">Major Defect</th>
                              </tr>
                            </thead>
                            <tbody>
                              {status.defects.map((defect, index) => (
                                <tr key={index} className="bg-white">
                                  <td className="px-4 py-2 border font-semibold">{defect}</td>
                                  <td className="px-4 py-2 border">Category B</td>
                                  <td className="px-4 py-2 border">Not tasty</td>
                                  <td className="px-4 py-2 border">Not edible</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Okays and Missed */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-green-700 font-medium mb-1">Okays</div>
                        <div className="flex gap-2 flex-wrap">
                          {status.okays.map((okay, i) => (
                            <span key={i} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">{okay}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600 font-medium mb-1">Missed</div>
                        <div className="flex gap-2 flex-wrap">
                          {checklistItems[cycleNo]
                            .filter((item) => !status.okays.includes(item) && !status.defects.includes(item))
                            .map((missed, i) => (
                              <span key={i} className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">{missed}</span>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ProductQualityIndex;
