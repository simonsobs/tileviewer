import { useState, useEffect } from 'react';

type UseQueryParams<T> = {
  queryFn: () => Promise<T>;
  queryKey: string[];
  initialData: T;
};

export function useQuery<T>({
  queryFn,
  queryKey,
  initialData,
}: UseQueryParams<T>) {
  const [data, setData] = useState<T>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    let doSetValue = true;

    const fetchData = async () => {
      setIsLoading(true);
      setIsError(false);

      try {
        const result = await queryFn();
        setData(result);
      } catch (e) {
        setIsError(true);
      }
      setIsLoading(false);
    };
    fetchData();
    return () => {
      doSetValue = false;
    };
  }, queryKey);

  return { data, isLoading, isError };
}
